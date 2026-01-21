// @ts-nocheck
import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import {
    CreateTaskCategoryDto,
    UpdateTaskCategoryDto,
} from './dto/task-category.dto';
import {
    CreateTaskTemplateDto,
    UpdateTaskTemplateDto,
} from './dto/task-template.dto';
import {
    CreateChecklistDto,
    CreateChecklistItemDto,
    ToggleChecklistItemDto,
    CreateCommentDto,
    CreateTimeLogDto,
    AddDependencyDto,
    ReorderTaskDto,
} from './dto/task-actions.dto';

// Multer storage configuration
const attachmentStorage = diskStorage({
    destination: './uploads/tasks',
    filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, uniqueSuffix + extname(file.originalname));
    },
});

@ApiTags('المهام - Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    // ============ TASKS ============

    @Post()
    @ApiOperation({ summary: 'إنشاء مهمة جديدة' })
    create(@Request() req: any, @Body() dto: CreateTaskDto) {
        return this.tasksService.createTask(req.user.id, req.user.companyId, dto);
    }

    @Get('my-tasks')
    @ApiOperation({ summary: 'مهامي - المهام المسندة لي أو التي أنشأتها' })
    getMyTasks(@Request() req: any) {
        return this.tasksService.getMyTasks(req.user.id, req.user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'قائمة المهام مع الفلترة والبحث' })
    findAll(@Request() req: any, @Query() query: TaskQueryDto) {
        return this.tasksService.getTasks(req.user.companyId, query);
    }

    @Get('kanban')
    @ApiOperation({ summary: 'لوحة Kanban للمهام' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'myTasks', required: false, type: Boolean })
    getKanban(
        @Request() req: any,
        @Query('categoryId') categoryId?: string,
        @Query('myTasks') myTasks?: string,
    ) {
        const userId = myTasks === 'true' ? req.user.id : undefined;
        return this.tasksService.getKanbanBoard(req.user.companyId, categoryId, userId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'إحصائيات المهام' })
    @ApiQuery({ name: 'myStats', required: false, type: Boolean })
    getStats(@Request() req: any, @Query('myStats') myStats?: string) {
        const userId = myStats === 'true' ? req.user.id : undefined;
        return this.tasksService.getTaskStats(req.user.companyId, userId);
    }

    @Get('gantt')
    @ApiOperation({ summary: 'بيانات Gantt Chart' })
    @ApiQuery({ name: 'categoryId', required: false, description: 'فلترة حسب الفئة' })
    getGanttData(@Request() req: any, @Query('categoryId') categoryId?: string) {
        return this.tasksService.getGanttData(req.user.companyId, categoryId);
    }

    // ============ BATCH 1: ADVANCED TASK MANAGEMENT (STATIC ROUTES) ============
    // NOTE: These MUST come BEFORE @Get(':id') to be matched correctly by NestJS!

    @Get('smart-priority')
    @ApiOperation({ summary: '🧠 المهام مرتبة حسب الأولوية الذكية' })
    @ApiQuery({ name: 'myTasks', required: false, type: Boolean })
    getSmartPrioritizedTasks(
        @Request() req: any,
        @Query('myTasks') myTasks?: string,
    ) {
        const userId = myTasks === 'true' ? req.user.id : undefined;
        return this.tasksService.getSmartPrioritizedTasks(req.user.companyId, userId);
    }

    @Get('dependency-graph')
    @ApiOperation({ summary: '🔗 رسم بياني لتبعيات المهام' })
    @ApiQuery({ name: 'categoryId', required: false })
    getDependencyGraph(
        @Request() req: any,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.tasksService.getDependencyGraph(req.user.companyId, categoryId);
    }

    @Get('workload-analysis')
    @ApiOperation({ summary: '⚖️ تحليل عبء العمل للموظفين' })
    getWorkloadAnalysis(@Request() req: any) {
        return this.tasksService.getWorkloadAnalysis(req.user.companyId);
    }

    @Get('burndown')
    @ApiOperation({ summary: '📉 مخطط الإنجاز (Burndown Chart)' })
    @ApiQuery({ name: 'sprintId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getBurndownDataV2(
        @Request() req: any,
        @Query('sprintId') sprintId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getBurndownDataV2(req.user.companyId, sprintId, startDate, endDate);
    }

    @Get('velocity')
    @ApiOperation({ summary: '🚀 سرعة الفريق (Velocity Tracking)' })
    @ApiQuery({ name: 'weeks', required: false, description: 'عدد الأسابيع (افتراضي 8)' })
    getVelocityData(
        @Request() req: any,
        @Query('weeks') weeks?: string,
    ) {
        return this.tasksService.getVelocityData(req.user.companyId, weeks ? parseInt(weeks) : 8);
    }

    @Post('ai-estimate')
    @ApiOperation({ summary: '🤖 تقدير وقت المهمة بالذكاء الاصطناعي' })
    estimateTaskDuration(
        @Request() req: any,
        @Body() body: { title: string; description?: string; categoryId?: string },
    ) {
        return this.tasksService.estimateTaskDuration(req.user.companyId, body.title, body.description, body.categoryId);
    }

    // ============ BATCH 2: TASK OPERATIONS ============

    @Post('clone/:id')
    @ApiOperation({ summary: '📋 نسخ مهمة مع التبعيات والقوائم (V2)' })
    @ApiParam({ name: 'id', description: 'معرف المهمة الأصلية' })
    cloneTaskV2(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            includeSubtasks?: boolean;
            includeDependencies?: boolean;
            includeChecklists?: boolean;
            newTitle?: string;
        },
    ) {
        return this.tasksService.cloneTaskV2(id, req.user.companyId, req.user.id, body);
    }

    @Post('merge')
    @ApiOperation({ summary: '🔀 دمج مهام متعددة في مهمة واحدة' })
    mergeTasks(
        @Request() req: any,
        @Body() body: { sourceTaskIds: string[]; targetTaskId: string },
    ) {
        return this.tasksService.mergeTasks(req.user.companyId, req.user.id, body.sourceTaskIds, body.targetTaskId);
    }

    @Post('split/:id')
    @ApiOperation({ summary: '✂️ تقسيم مهمة إلى مهام فرعية' })
    @ApiParam({ name: 'id', description: 'معرف المهمة الأم' })
    splitTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { subtaskTitles: string[] },
    ) {
        return this.tasksService.splitTask(id, req.user.companyId, req.user.id, body.subtaskTitles);
    }

    @Post(':id/version')
    @ApiOperation({ summary: '💾 إنشاء نسخة إصدار للمهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    createTaskVersion(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { note?: string },
    ) {
        return this.tasksService.createTaskVersion(id, req.user.companyId, req.user.id, body.note);
    }

    @Get(':id/versions')
    @ApiOperation({ summary: '📚 عرض إصدارات المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getTaskVersions(
        @Request() req: any,
        @Param('id') id: string,
    ) {
        return this.tasksService.getTaskVersions(id, req.user.companyId);
    }

    @Post(':id/rollback/:version')
    @ApiOperation({ summary: '⏪ التراجع لإصدار سابق' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiParam({ name: 'version', description: 'رقم الإصدار' })
    rollbackTask(
        @Request() req: any,
        @Param('id') id: string,
        @Param('version') version: string,
    ) {
        return this.tasksService.rollbackTask(id, req.user.companyId, req.user.id, parseInt(version));
    }

    // ============ TIMELINE & ANALYSIS (MUST BE BEFORE :id) ============
    @Get('timeline')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📅 عرض الجدول الزمني' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['assignee', 'category', 'priority', 'status'] })
    @ApiQuery({ name: 'zoom', required: false, enum: ['day', 'week', 'month'] })
    getTimelineView(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('groupBy') groupBy?: 'assignee' | 'category' | 'priority' | 'status',
        @Query('zoom') zoom?: 'day' | 'week' | 'month',
    ) {
        return this.tasksService.getTimelineView(req.user.companyId, { startDate, endDate, groupBy, zoom });
    }

    @Get('buffer-time')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '⏱️ حساب وقت الاحتياط' })
    @ApiQuery({ name: 'taskId', required: false })
    getBufferTime(
        @Request() req: any,
        @Query('taskId') taskId?: string,
    ) {
        return this.tasksService.calculateBufferTime(req.user.companyId, taskId);
    }

    @Get('critical-path')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🔴 تحليل المسار الحرج' })
    @ApiQuery({ name: 'projectId', required: false })
    getCriticalPath(
        @Request() req: any,
        @Query('projectId') projectId?: string,
    ) {
        return this.tasksService.getCriticalPath(req.user.companyId, projectId);
    }

    @Post('what-if')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🔮 سيناريوهات ماذا لو' })
    runWhatIfScenario(
        @Request() req: any,
        @Body() body: {
            type: 'delay_task' | 'add_resource' | 'change_priority' | 'remove_dependency' | 'extend_deadline';
            taskId?: string;
            parameters: {
                delayDays?: number;
                resourceMultiplier?: number;
                newPriority?: string;
                dependencyToRemove?: string;
                newDeadline?: string;
            };
        },
    ) {
        return this.tasksService.runWhatIfScenario(req.user.companyId, body);
    }

    // ============ SLA TRACKING ============
    @Get('sla/config')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '⏱️ إعدادات SLA' })
    getSLAConfig(@Request() req: any) {
        return this.tasksService.getSLAConfig(req.user.companyId);
    }

    @Put('sla/config')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: '⏱️ تحديث إعدادات SLA' })
    updateSLAConfig(@Request() req: any, @Body() body: Record<string, { responseHours: number; resolutionHours: number }>) {
        return this.tasksService.updateSLAConfig(req.user.companyId, req.user.id, body);
    }

    @Get('sla/violations')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🚨 مخالفات SLA' })
    checkSLAViolations(@Request() req: any) {
        return this.tasksService.checkSLAViolations(req.user.companyId);
    }

    // ============ ESCALATION RULES ============
    @Get('escalation/rules')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📈 قواعد التصعيد' })
    getEscalationRules(@Request() req: any) {
        return this.tasksService.getEscalationRules(req.user.companyId);
    }

    @Put('escalation/rules')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: '📈 تحديث قواعد التصعيد' })
    updateEscalationRules(@Request() req: any, @Body() body: any[]) {
        return this.tasksService.updateEscalationRules(req.user.companyId, req.user.id, body);
    }

    @Post('escalation/trigger')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🚀 تشغيل تصعيد يدوي' })
    triggerEscalation(@Request() req: any, @Body() body: { taskId: string; ruleId: string }) {
        return this.tasksService.triggerEscalation(req.user.companyId, body.taskId, body.ruleId);
    }

    @Post('escalation/check')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    @ApiOperation({ summary: '🔍 فحص التصعيدات التلقائية' })
    runEscalationCheck(@Request() req: any) {
        return this.tasksService.runEscalationCheck(req.user.companyId);
    }

    // ============ RELEASE PLANNING ============
    @Get('releases')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📦 قائمة الإصدارات' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'limit', required: false })
    getReleases(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
    ) {
        return this.tasksService.getReleases(req.user.companyId, { status, limit: limit ? parseInt(limit) : undefined });
    }

    @Post('releases')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '📦 إنشاء إصدار جديد' })
    createRelease(@Request() req: any, @Body() body: { name: string; description?: string; startDate: Date; endDate: Date; taskIds?: string[] }) {
        return this.tasksService.createRelease(req.user.companyId, req.user.id, body);
    }

    @Get('releases/:releaseId/progress')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📊 تقدم الإصدار' })
    @ApiParam({ name: 'releaseId', description: 'معرف الإصدار' })
    getReleaseProgress(@Request() req: any, @Param('releaseId') releaseId: string) {
        return this.tasksService.getReleaseProgress(req.user.companyId, releaseId);
    }

    @Post('releases/:releaseId/tasks')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '➕ إضافة مهام للإصدار' })
    @ApiParam({ name: 'releaseId', description: 'معرف الإصدار' })
    addTasksToRelease(@Request() req: any, @Param('releaseId') releaseId: string, @Body() body: { taskIds: string[] }) {
        return this.tasksService.addTasksToRelease(req.user.companyId, releaseId, body.taskIds);
    }

    @Delete('releases/:releaseId/tasks')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '➖ إزالة مهام من الإصدار' })
    @ApiParam({ name: 'releaseId', description: 'معرف الإصدار' })
    removeTasksFromRelease(@Request() req: any, @Param('releaseId') releaseId: string, @Body() body: { taskIds: string[] }) {
        return this.tasksService.removeTasksFromRelease(req.user.companyId, releaseId, body.taskIds);
    }

    // ============ ROADMAP VIEW ============
    @Get('roadmap')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🗺️ خريطة الطريق' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['quarter', 'month'] })
    getRoadmapData(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('groupBy') groupBy?: 'quarter' | 'month',
    ) {
        return this.tasksService.getRoadmapData(req.user.companyId, { startDate, endDate, groupBy });
    }

    @Post('milestones')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '🎯 إنشاء معلم' })
    createMilestone(@Request() req: any, @Body() body: { title: string; description?: string; dueDate: Date; releaseId?: string }) {
        return this.tasksService.createMilestone(req.user.companyId, req.user.id, body);
    }

    @Patch('milestones/:id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER')
    @ApiOperation({ summary: '✏️ تحديث معلم' })
    @ApiParam({ name: 'id', description: 'معرف المعلم' })
    updateMilestone(@Request() req: any, @Param('id') id: string, @Body() body: Partial<{ title: string; description: string; dueDate: Date; status: string }>) {
        return this.tasksService.updateMilestone(req.user.companyId, id, body);
    }

    // ============ TEAM COLLABORATION (10 ميزات) ============
    @Get('team/workload')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📊 لوحة أحمال الفريق' })
    getTeamWorkload(@Request() req: any) {
        return this.tasksService.getTeamWorkloadDashboard(req.user.companyId);
    }

    @Get('team/skills-matrix')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🎯 مصفوفة المهارات' })
    getSkillsMatrix(@Request() req: any) {
        return this.tasksService.getSkillsMatrix(req.user.companyId);
    }

    @Get('team/utilization')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📈 استخدام الموارد' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getResourceUtilization(@Request() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        return this.tasksService.getResourceUtilization(req.user.companyId, startDate, endDate);
    }

    @Get('team/performance')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '📊 مؤشرات أداء الفريق' })
    @ApiQuery({ name: 'days', required: false })
    getTeamPerformance(@Request() req: any, @Query('days') days?: number) {
        return this.tasksService.getTeamPerformanceMetrics(req.user.companyId, days || 30);
    }

    @Get('team/collaboration-score')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'HR_MANAGER', 'MANAGER')
    @ApiOperation({ summary: '🤝 درجة التعاون' })
    @ApiQuery({ name: 'days', required: false })
    getCollaborationScore(@Request() req: any, @Query('days') days?: number) {
        return this.tasksService.getCollaborationScore(req.user.companyId, days || 30);
    }

    @Get('team/mentions')
    @ApiOperation({ summary: '📢 إشارات محسنة' })
    @ApiQuery({ name: 'type', required: false, enum: ['received', 'sent'] })
    getEnhancedMentions(@Request() req: any, @Query('type') type: 'received' | 'sent' = 'received') {
        return this.tasksService.getEnhancedMentions(req.user.id, req.user.companyId, type);
    }

    @Get('team/realtime-config')
    @ApiOperation({ summary: '⚡ إعدادات التعاون اللحظي' })
    getRealTimeConfig(@Request() req: any) {
        return this.tasksService.getRealTimeCollabConfig(req.user.companyId);
    }

    @Post('team/screen-share')
    @ApiOperation({ summary: '🖥️ بدء مشاركة الشاشة' })
    createScreenShare(@Request() req: any, @Body() body: { taskId?: string }) {
        return this.tasksService.createScreenShareSession(req.user.companyId, req.user.id, body.taskId);
    }

    @Post('team/video-call')
    @ApiOperation({ summary: '📹 بدء مكالمة فيديو' })
    createVideoCall(@Request() req: any, @Body() body: { participantIds: string[]; taskId?: string }) {
        return this.tasksService.createVideoCallSession(req.user.companyId, req.user.id, body.participantIds, body.taskId);
    }

    @Get('team/chat')
    @ApiOperation({ summary: '💬 دردشة الفريق' })
    @ApiQuery({ name: 'taskId', required: false })
    getTeamChat(@Request() req: any, @Query('taskId') taskId?: string) {
        return this.tasksService.getTeamChatConfig(req.user.companyId, taskId);
    }

    @Get('template-categories')
    @ApiOperation({ summary: '📚 مكتبة قوالب المهام مصنفة' })
    getTemplateCategories(@Request() req: any) {
        return this.tasksService.getTemplateCategories(req.user.companyId);
    }

    // ============ AUTOMATIONS (MUST BE BEFORE :id) ============
    @Get('automations')
    @ApiOperation({ summary: 'قواعد الأتمتة' })
    getAutomationsList(@Request() req: any) {
        return this.tasksService.getAutomations(req.user.companyId);
    }

    @Post('automations')
    @ApiOperation({ summary: 'إنشاء قاعدة أتمتة' })
    createNewAutomation(
        @Request() req: any,
        @Body() body: {
            name: string;
            description?: string;
            trigger: string;
            triggerConfig?: any;
            action: string;
            actionConfig?: any;
            categoryId?: string;
            priority?: string;
        },
    ) {
        return this.tasksService.createAutomation(req.user.companyId, req.user.id, body);
    }

    // ============ RECURRING TASKS (MUST BE BEFORE :id) ============
    @Get('recurring')
    @ApiOperation({ summary: 'المهام المتكررة' })
    getRecurringTasksList(@Request() req: any) {
        return this.tasksService.getRecurringTasks(req.user.companyId);
    }

    @Post('recurring')
    @ApiOperation({ summary: 'إنشاء مهمة متكررة' })
    createNewRecurringTask(
        @Request() req: any,
        @Body() body: CreateTaskDto & { recurrenceType: string; recurrenceEnd?: string },
    ) {
        return this.tasksService.createRecurringTask(req.user.id, req.user.companyId, body);
    }

    // ============ ANALYTICS REPORT (MUST BE BEFORE :id) ============
    @Post('analytics/report')
    @ApiOperation({ summary: 'إنشاء تقرير تحليلي للمهام' })
    generateAnalyticsReport(
        @Request() req: any,
        @Body() body: {
            startDate?: string;
            endDate?: string;
            categoryId?: string;
            assigneeId?: string;
            includeMetrics?: boolean;
            includeTeam?: boolean;
            includeTime?: boolean;
            includeTrends?: boolean;
        },
    ) {
        return this.tasksService.generateAnalyticsReport(req.user.companyId, body);
    }


    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getTaskById(id, req.user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'تحديث مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.tasksService.updateTask(id, req.user.companyId, req.user.id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.deleteTask(id, req.user.companyId, req.user.id);
    }

    @Patch(':id/reorder')
    @ApiOperation({ summary: 'إعادة ترتيب مهمة (Kanban)' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    reorder(@Request() req: any, @Param('id') id: string, @Body() dto: ReorderTaskDto) {
        return this.tasksService.reorderTask(id, req.user.companyId, req.user.id, dto);
    }

    // ============ CHECKLISTS ============

    @Post(':id/checklists')
    @ApiOperation({ summary: 'إضافة قائمة تحقق' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    addChecklist(@Request() req: any, @Param('id') id: string, @Body() dto: CreateChecklistDto) {
        return this.tasksService.addChecklist(id, req.user.companyId, req.user.id, dto);
    }

    @Post('checklists/:checklistId/items')
    @ApiOperation({ summary: 'إضافة عنصر لقائمة التحقق' })
    @ApiParam({ name: 'checklistId', description: 'معرف قائمة التحقق' })
    addChecklistItem(
        @Request() req: any,
        @Param('checklistId') checklistId: string,
        @Body() dto: CreateChecklistItemDto,
    ) {
        return this.tasksService.addChecklistItem(checklistId, req.user.companyId, req.user.id, dto);
    }

    @Patch('checklist-items/:itemId/toggle')
    @ApiOperation({ summary: 'تبديل حالة عنصر قائمة التحقق' })
    @ApiParam({ name: 'itemId', description: 'معرف العنصر' })
    toggleChecklistItem(
        @Request() req: any,
        @Param('itemId') itemId: string,
        @Body() dto: ToggleChecklistItemDto,
    ) {
        return this.tasksService.toggleChecklistItem(
            itemId,
            req.user.companyId,
            req.user.id,
            dto.isCompleted,
        );
    }

    @Delete('checklist-items/:itemId')
    @ApiOperation({ summary: 'حذف عنصر من قائمة التحقق' })
    @ApiParam({ name: 'itemId', description: 'معرف العنصر' })
    deleteChecklistItem(@Request() req: any, @Param('itemId') itemId: string) {
        return this.tasksService.deleteChecklistItem(itemId, req.user.companyId, req.user.id);
    }

    // ============ COMMENTS ============

    @Post(':id/comments')
    @ApiOperation({ summary: 'إضافة تعليق' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    addComment(@Request() req: any, @Param('id') id: string, @Body() dto: CreateCommentDto) {
        return this.tasksService.addComment(id, req.user.companyId, req.user.id, dto);
    }

    @Delete('comments/:commentId')
    @ApiOperation({ summary: 'حذف تعليق' })
    @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
    deleteComment(@Request() req: any, @Param('commentId') commentId: string) {
        return this.tasksService.deleteComment(commentId, req.user.companyId, req.user.id);
    }

    // ============ TIME LOGS ============

    @Post(':id/time-logs')
    @ApiOperation({ summary: 'تسجيل وقت عمل' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    addTimeLog(@Request() req: any, @Param('id') id: string, @Body() dto: CreateTimeLogDto) {
        return this.tasksService.addTimeLog(id, req.user.companyId, req.user.id, dto);
    }

    // ============ WATCHERS ============

    @Post(':id/watch')
    @ApiOperation({ summary: 'متابعة مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    watch(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.addWatcher(id, req.user.companyId, req.user.id);
    }

    @Delete(':id/watch')
    @ApiOperation({ summary: 'إلغاء متابعة مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    unwatch(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.removeWatcher(id, req.user.companyId, req.user.id);
    }

    // ============ DEPENDENCIES ============

    @Post(':id/dependencies')
    @ApiOperation({ summary: 'إضافة اعتماد (المهمة محظورة بسبب مهمة أخرى)' })
    @ApiParam({ name: 'id', description: 'معرف المهمة المحظورة' })
    addDependency(@Request() req: any, @Param('id') id: string, @Body() dto: AddDependencyDto) {
        return this.tasksService.addDependency(
            id,
            dto.blockingTaskId,
            req.user.companyId,
            req.user.id,
        );
    }

    @Delete(':id/dependencies/:blockingTaskId')
    @ApiOperation({ summary: 'إزالة اعتماد' })
    @ApiParam({ name: 'id', description: 'معرف المهمة المحظورة' })
    @ApiParam({ name: 'blockingTaskId', description: 'معرف المهمة المانعة' })
    removeDependency(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockingTaskId') blockingTaskId: string,
    ) {
        return this.tasksService.removeDependency(id, blockingTaskId, req.user.companyId);
    }

    // ============ ATTACHMENTS ============

    @Post(':id/attachments')
    @ApiOperation({ summary: 'رفع مرفق للمهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', { storage: attachmentStorage }))
    uploadAttachment(
        @Request() req: any,
        @Param('id') id: string,
        @UploadedFile() file: any,
    ) {
        return this.tasksService.addAttachment(id, req.user.companyId, req.user.id, file);
    }


    @Delete('attachments/:attachmentId')
    @ApiOperation({ summary: 'حذف مرفق' })
    @ApiParam({ name: 'attachmentId', description: 'معرف المرفق' })
    deleteAttachment(@Request() req: any, @Param('attachmentId') attachmentId: string) {
        return this.tasksService.deleteAttachment(attachmentId, req.user.companyId, req.user.id);
    }

    // ==================== WORKFLOW ENDPOINTS ====================

    @Post(':id/workflow/request-review')
    @ApiOperation({ summary: 'طلب مراجعة المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    requestReview(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.requestReview(id, req.user.companyId, req.user.id);
    }

    @Post(':id/workflow/start-review')
    @ApiOperation({ summary: 'بدء مراجعة المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    startReview(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.startReview(id, req.user.companyId, req.user.id);
    }

    @Post(':id/workflow/approve')
    @ApiOperation({ summary: 'الموافقة على المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    approveTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { comment?: string },
    ) {
        return this.tasksService.approveTask(id, req.user.companyId, req.user.id, body?.comment);
    }

    @Post(':id/workflow/reject')
    @ApiOperation({ summary: 'رفض المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    rejectTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { reason: string },
    ) {
        return this.tasksService.rejectTask(id, req.user.companyId, req.user.id, body.reason);
    }

    @Post(':id/workflow/request-changes')
    @ApiOperation({ summary: 'طلب تعديلات على المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    requestChanges(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { feedback: string },
    ) {
        return this.tasksService.requestChanges(id, req.user.companyId, req.user.id, body.feedback);
    }

    @Get(':id/workflow/history')
    @ApiOperation({ summary: 'سجل الموافقات والمراجعات' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getApprovalHistory(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getApprovalHistory(id, req.user.companyId);
    }

    // ==================== EVIDENCE ENDPOINTS ====================

    @Post(':id/evidence')
    @ApiOperation({ summary: 'تقديم إثبات إنجاز' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    submitEvidence(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            description?: string;
            fileUrl?: string;
            fileName?: string;
            fileType?: string;
            fileSize?: number;
            latitude?: number;
            longitude?: number;
            locationName?: string;
        },
    ) {
        return this.tasksService.submitEvidence(id, req.user.companyId, req.user.id, body);
    }

    @Get(':id/evidence')
    @ApiOperation({ summary: 'عرض إثباتات الإنجاز' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getEvidences(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getEvidences(id, req.user.companyId);
    }

    @Post('evidence/:evidenceId/verify')
    @ApiOperation({ summary: 'اعتماد أو رفض إثبات الإنجاز' })
    @ApiParam({ name: 'evidenceId', description: 'معرف الإثبات' })
    verifyEvidence(
        @Request() req: any,
        @Param('evidenceId') evidenceId: string,
        @Body() body: { status: 'APPROVED' | 'REJECTED'; comment?: string },
    ) {
        return this.tasksService.verifyEvidence(evidenceId, req.user.companyId, req.user.id, body.status, body.comment);
    }

    @Delete('evidence/:evidenceId')
    @ApiOperation({ summary: 'حذف إثبات الإنجاز' })
    @ApiParam({ name: 'evidenceId', description: 'معرف الإثبات' })
    deleteEvidence(@Request() req: any, @Param('evidenceId') evidenceId: string) {
        return this.tasksService.deleteEvidence(evidenceId, req.user.companyId, req.user.id);
    }

    // ==================== DEPENDENCY & GANTT ENDPOINTS ====================

    @Get(':id/dependencies')
    @ApiOperation({ summary: 'عرض تبعيات المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getDependencies(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getDependencies(id, req.user.companyId);
    }

    @Patch('dependencies/:dependencyId/type')
    @ApiOperation({ summary: 'تحديث نوع التبعية' })
    @ApiParam({ name: 'dependencyId', description: 'معرف التبعية' })
    updateDependencyType(
        @Request() req: any,
        @Param('dependencyId') dependencyId: string,
        @Body() body: { type: 'BLOCKS' | 'BLOCKED_BY' | 'RELATED' | 'DUPLICATES' },
    ) {
        return this.tasksService.updateDependencyType(dependencyId, req.user.companyId, body.type);
    }

    // ==================== COMMUNICATION HUB ENDPOINTS ====================

    @Get(':id/comments/threaded')
    @ApiOperation({ summary: 'عرض التعليقات مع الردود' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getComments(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getComments(id, req.user.companyId);
    }

    @Post('comments/:commentId/reply')
    @ApiOperation({ summary: 'الرد على تعليق' })
    @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
    replyToComment(
        @Request() req: any,
        @Param('commentId') commentId: string,
        @Body() body: { content: string; mentions?: string[] },
    ) {
        return this.tasksService.replyToComment(
            commentId,
            req.user.companyId,
            req.user.id,
            body.content,
            body.mentions || [],
        );
    }

    @Post('comments/:commentId/reactions')
    @ApiOperation({ summary: 'إضافة تفاعل على تعليق' })
    @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
    addReaction(
        @Request() req: any,
        @Param('commentId') commentId: string,
        @Body() body: { emoji: string },
    ) {
        return this.tasksService.addReaction(commentId, req.user.companyId, req.user.id, body.emoji);
    }

    @Delete('comments/:commentId/reactions/:emoji')
    @ApiOperation({ summary: 'إزالة تفاعل من تعليق' })
    @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
    @ApiParam({ name: 'emoji', description: 'الإيموجي' })
    removeReaction(
        @Request() req: any,
        @Param('commentId') commentId: string,
        @Param('emoji') emoji: string,
    ) {
        return this.tasksService.removeReaction(commentId, req.user.companyId, req.user.id, emoji);
    }

    @Get(':id/activity')
    @ApiOperation({ summary: 'سجل نشاط المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج' })
    getActivityFeed(
        @Request() req: any,
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        return this.tasksService.getActivityFeed(id, req.user.companyId, limit ? parseInt(limit) : 50);
    }

    // ==================== ANALYTICS ENDPOINTS ====================

    @Get('analytics/metrics')
    @ApiOperation({ summary: 'إحصائيات الإنتاجية' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getProductivityMetrics(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getProductivityMetrics(
            req.user.companyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/team')
    @ApiOperation({ summary: 'أداء الفريق' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getTeamPerformanceAnalytics(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getTeamPerformance(
            req.user.companyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/time')
    @ApiOperation({ summary: 'تحليل الوقت المسجل' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getTimeAnalytics(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getTimeAnalytics(
            req.user.companyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/trends')
    @ApiOperation({ summary: 'اتجاهات المهام' })
    @ApiQuery({ name: 'days', required: false, description: 'عدد الأيام (افتراضي 30)' })
    getTaskTrends(
        @Request() req: any,
        @Query('days') days?: string,
    ) {
        return this.tasksService.getTaskTrends(req.user.companyId, days ? parseInt(days) : 30);
    }

    @Post('analytics/report')
    @ApiOperation({ summary: 'توليد تقرير شامل' })
    generateReport(
        @Request() req: any,
        @Body() body: {
            startDate?: string;
            endDate?: string;
            categoryId?: string;
            assigneeId?: string;
            includeMetrics?: boolean;
            includeTeam?: boolean;
            includeTime?: boolean;
            includeTrends?: boolean;
        },
    ) {
        return this.tasksService.generateReport(req.user.companyId, {
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
            categoryId: body.categoryId,
            assigneeId: body.assigneeId,
            includeMetrics: body.includeMetrics,
            includeTeam: body.includeTeam,
            includeTime: body.includeTime,
            includeTrends: body.includeTrends,
        });
    }

    // ==================== AUTOMATION ENDPOINTS ====================

    @Post('automations')
    @ApiOperation({ summary: 'إنشاء قاعدة أتمتة' })
    createAutomation(
        @Request() req: any,
        @Body() body: {
            name: string;
            description?: string;
            trigger: string;
            triggerConfig?: any;
            action: string;
            actionConfig?: any;
            categoryId?: string;
            priority?: string;
        },
    ) {
        return this.tasksService.createAutomation(req.user.companyId, req.user.id, body);
    }

    @Get('automations')
    @ApiOperation({ summary: 'قواعد الأتمتة' })
    getAutomations(@Request() req: any) {
        return this.tasksService.getAutomations(req.user.companyId);
    }

    @Patch('automations/:id')
    @ApiOperation({ summary: 'تحديث قاعدة أتمتة' })
    @ApiParam({ name: 'id', description: 'معرف القاعدة' })
    updateAutomation(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: Partial<{
            name: string;
            description: string;
            trigger: string;
            triggerConfig: any;
            action: string;
            actionConfig: any;
            categoryId: string;
            priority: string;
            isActive: boolean;
        }>,
    ) {
        return this.tasksService.updateAutomation(id, req.user.companyId, body);
    }

    @Delete('automations/:id')
    @ApiOperation({ summary: 'حذف قاعدة أتمتة' })
    @ApiParam({ name: 'id', description: 'معرف القاعدة' })
    deleteAutomation(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.deleteAutomation(id, req.user.companyId);
    }

    @Patch('automations/:id/toggle')
    @ApiOperation({ summary: 'تفعيل/تعطيل قاعدة أتمتة' })
    @ApiParam({ name: 'id', description: 'معرف القاعدة' })
    toggleAutomation(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.toggleAutomation(id, req.user.companyId);
    }

    @Get('automations/:id/logs')
    @ApiOperation({ summary: 'سجل تنفيذ الأتمتة' })
    @ApiParam({ name: 'id', description: 'معرف القاعدة' })
    @ApiQuery({ name: 'limit', required: false })
    getAutomationLogs(
        @Request() req: any,
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        return this.tasksService.getAutomationLogs(id, req.user.companyId, limit ? parseInt(limit) : 50);
    }

    // ==================== WORKLOAD MANAGEMENT ====================

    @Get('workload/team')
    @ApiOperation({ summary: 'عبء عمل الفريق' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getTeamWorkloadByDate(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getTeamWorkload(
            req.user.companyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('workload/calendar')
    @ApiOperation({ summary: 'تقويم عبء العمل' })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'month', required: false })
    @ApiQuery({ name: 'year', required: false })
    getWorkloadCalendar(
        @Request() req: any,
        @Query('userId') userId?: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return this.tasksService.getWorkloadCalendar(
            req.user.companyId,
            userId,
            month ? parseInt(month) : undefined,
            year ? parseInt(year) : undefined,
        );
    }

    // ==================== TIME TRACKING ENHANCEMENTS ====================

    @Post(':id/timer/start')
    @ApiOperation({ summary: 'بدء مؤقت للمهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    startTimer(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.startTimer(id, req.user.companyId, req.user.id);
    }

    @Post('timer/:timeLogId/stop')
    @ApiOperation({ summary: 'إيقاف المؤقت' })
    @ApiParam({ name: 'timeLogId', description: 'معرف سجل الوقت' })
    stopTimer(
        @Request() req: any,
        @Param('timeLogId') timeLogId: string,
        @Body() body: { description?: string },
    ) {
        return this.tasksService.stopTimer(timeLogId, req.user.companyId, req.user.id, body?.description);
    }

    @Get('timer/active')
    @ApiOperation({ summary: 'المؤقت النشط حالياً' })
    getActiveTimer(@Request() req: any) {
        return this.tasksService.getActiveTimer(req.user.companyId, req.user.id);
    }

    @Get('time-logs/my')
    @ApiOperation({ summary: 'سجلات الوقت الخاصة بي' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getUserTimeLogs(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getUserTimeLogs(
            req.user.companyId,
            req.user.id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    // ==================== GANTT ENHANCEMENTS ====================

    @Patch(':id/dates')
    @ApiOperation({ summary: 'تحديث تواريخ المهمة (Gantt)' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    updateTaskDates(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { startDate: string; endDate: string },
    ) {
        return this.tasksService.updateTaskDates(id, req.user.companyId, req.user.id, body.startDate, body.endDate);
    }

    @Get('gantt/enhanced')
    @ApiOperation({ summary: 'بيانات Gantt المحسنة' })
    @ApiQuery({ name: 'projectId', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'assigneeId', required: false })
    getGanttDataEnhanced(
        @Request() req: any,
        @Query('projectId') projectId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('assigneeId') assigneeId?: string,
    ) {
        return this.tasksService.getGanttDataEnhanced(req.user.companyId, {
            projectId,
            categoryId,
            assigneeId,
        });
    }

    // ==================== CUSTOM FIELDS ====================

    @Patch(':id/custom-fields')
    @ApiOperation({ summary: 'تحديث الحقول المخصصة للمهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    updateCustomFields(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { customFields: Record<string, any> },
    ) {
        return this.tasksService.updateCustomFields(id, req.user.companyId, req.user.id, body.customFields);
    }

    @Get('custom-fields/definitions')
    @ApiOperation({ summary: 'تعريفات الحقول المخصصة' })
    getCustomFieldDefinitions(@Request() req: any) {
        return this.tasksService.getCustomFieldDefinitions(req.user.companyId);
    }

    // ==================== BULK OPERATIONS ====================

    @Post('bulk/update')
    @ApiOperation({ summary: 'تحديث مهام متعددة' })
    bulkUpdateTasks(
        @Request() req: any,
        @Body() body: {
            taskIds: string[];
            updates: {
                status?: string;
                priority?: string;
                assigneeId?: string;
                categoryId?: string;
                dueDate?: string;
            };
        },
    ) {
        return this.tasksService.bulkUpdateTasks(req.user.companyId, req.user.id, body.taskIds, body.updates);
    }

    @Post('bulk/delete')
    @ApiOperation({ summary: 'حذف مهام متعددة' })
    bulkDeleteTasks(
        @Request() req: any,
        @Body() body: { taskIds: string[] },
    ) {
        return this.tasksService.bulkDeleteTasks(req.user.companyId, req.user.id, body.taskIds);
    }

    // ==================== TASK CLONING ====================

    @Post(':id/clone')
    @ApiOperation({ summary: 'استنساخ مهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    cloneTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body?: {
            includeChecklists?: boolean;
            includeAttachments?: boolean;
            includeDependencies?: boolean;
            newAssigneeId?: string;
        },
    ) {
        return this.tasksService.cloneTask(id, req.user.companyId, req.user.id, body);
    }

    // ==================== BATCH 3: AGILE & STRATEGIC PLANNING ====================

    // ============ RESOURCE PLANNING ============

    @Get('capacity/resources')
    @ApiOperation({ summary: 'تخطيط موارد الفريق' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getResourceCapacity(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getResourceCapacity(
            req.user.companyId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get(':id/suggest-reassignment')
    @ApiOperation({ summary: 'اقتراح إعادة تعيين المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    suggestReassignment(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.suggestTaskReassignment(id, req.user.companyId);
    }

    // ============ SPRINT PLANNING ============

    @Post('sprints')
    @ApiOperation({ summary: 'إنشاء سبرنت جديد' })
    createSprint(
        @Request() req: any,
        @Body() body: {
            name: string;
            goal?: string;
            startDate: string;
            endDate: string;
            projectId?: string;
        },
    ) {
        return this.tasksService.createSprint(req.user.companyId, req.user.id, body);
    }

    @Get('sprints')
    @ApiOperation({ summary: 'قائمة السبرنتات' })
    @ApiQuery({ name: 'status', required: false })
    getSprints(@Request() req: any, @Query('status') status?: string) {
        return this.tasksService.getSprints(req.user.companyId, status);
    }

    @Post('sprints/:sprintId/start')
    @ApiOperation({ summary: 'بدء السبرنت' })
    @ApiParam({ name: 'sprintId', description: 'معرف السبرنت' })
    startSprint(@Request() req: any, @Param('sprintId') sprintId: string) {
        return this.tasksService.startSprint(sprintId, req.user.companyId);
    }

    @Post('sprints/:sprintId/complete')
    @ApiOperation({ summary: 'إنهاء السبرنت' })
    @ApiParam({ name: 'sprintId', description: 'معرف السبرنت' })
    completeSprint(
        @Request() req: any,
        @Param('sprintId') sprintId: string,
        @Body() body?: { moveIncompleteToSprintId?: string },
    ) {
        return this.tasksService.completeSprint(sprintId, req.user.companyId, body?.moveIncompleteToSprintId);
    }

    // ============ STORY POINTS & VELOCITY ============

    @Patch(':id/story-points')
    @ApiOperation({ summary: 'تحديث نقاط القصة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    updateStoryPoints(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { storyPoints: number },
    ) {
        return this.tasksService.updateStoryPoints(id, req.user.companyId, req.user.id, body.storyPoints);
    }

    @Get('velocity')
    @ApiOperation({ summary: 'سرعة الفريق (Velocity)' })
    @ApiQuery({ name: 'sprintCount', required: false })
    getTeamVelocity(@Request() req: any, @Query('sprintCount') sprintCount?: string) {
        return this.tasksService.getTeamVelocity(req.user.companyId, sprintCount ? parseInt(sprintCount) : undefined);
    }

    // ============ BURNDOWN CHARTS ============

    @Get('sprints/:sprintId/burndown')
    @ApiOperation({ summary: 'بيانات مخطط Burndown' })
    @ApiParam({ name: 'sprintId', description: 'معرف السبرنت' })
    getBurndownData(@Request() req: any, @Param('sprintId') sprintId: string) {
        return this.tasksService.getBurndownData(sprintId, req.user.companyId);
    }

    // ============ OKRs INTEGRATION ============

    @Post(':id/okr')
    @ApiOperation({ summary: 'ربط المهمة بـ OKR' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    linkToOkr(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            objectiveId?: string;
            keyResultId?: string;
            contribution?: number;
        },
    ) {
        return this.tasksService.linkTaskToOkr(id, req.user.companyId, req.user.id, body);
    }

    @Get('okr/tasks')
    @ApiOperation({ summary: 'المهام المرتبطة بـ OKR' })
    @ApiQuery({ name: 'objectiveId', required: false })
    @ApiQuery({ name: 'keyResultId', required: false })
    getTasksByOkr(
        @Request() req: any,
        @Query('objectiveId') objectiveId?: string,
        @Query('keyResultId') keyResultId?: string,
    ) {
        return this.tasksService.getTasksByOkr(req.user.companyId, objectiveId, keyResultId);
    }

    // ============ TASK SCORING & PRIORITIZATION ============

    @Post(':id/score')
    @ApiOperation({ summary: 'حساب درجة أولوية المهمة (RICE)' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    calculateScore(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            reach?: number;
            impact?: number;
            confidence?: number;
            effort?: number;
            urgency?: number;
            value?: number;
        },
    ) {
        return this.tasksService.calculateTaskScore(id, req.user.companyId, req.user.id, body);
    }

    @Get('backlog/prioritized')
    @ApiOperation({ summary: 'قائمة المهام المرتبة حسب الأولوية' })
    @ApiQuery({ name: 'scoreType', required: false, enum: ['rice', 'weighted'] })
    getPrioritizedBacklog(
        @Request() req: any,
        @Query('scoreType') scoreType?: 'rice' | 'weighted',
    ) {
        return this.tasksService.getPrioritizedBacklog(req.user.companyId, scoreType);
    }

    // ============ SMART SUGGESTIONS ============

    @Get('suggestions/smart')
    @ApiOperation({ summary: 'اقتراحات ذكية للمهام' })
    getSmartSuggestions(@Request() req: any) {
        return this.tasksService.getSmartSuggestions(req.user.companyId, req.user.id);
    }

    @Get('suggestions/recommended')
    @ApiOperation({ summary: 'المهام الموصى بها' })
    getRecommendedTasks(@Request() req: any) {
        return this.tasksService.getRecommendedTasks(req.user.companyId, req.user.id);
    }

    // ==================== BATCH 4: EXTERNAL INTEGRATIONS & NOTIFICATIONS ====================

    // ============ REMINDERS ============

    @Post(':id/reminders')
    @ApiOperation({ summary: 'إضافة تذكير للمهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    setReminder(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            reminderAt: string;
            reminderType: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
            message?: string;
        },
    ) {
        return this.tasksService.setTaskReminder(id, req.user.companyId, req.user.id, body);
    }

    @Get(':id/reminders')
    @ApiOperation({ summary: 'تذكيرات المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getReminders(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getTaskReminders(id, req.user.companyId);
    }

    @Delete(':id/reminders/:reminderId')
    @ApiOperation({ summary: 'حذف تذكير' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiParam({ name: 'reminderId', description: 'معرف التذكير' })
    deleteReminder(
        @Request() req: any,
        @Param('id') id: string,
        @Param('reminderId') reminderId: string,
    ) {
        return this.tasksService.deleteReminder(id, req.user.companyId, reminderId);
    }

    @Get('reminders/pending')
    @ApiOperation({ summary: 'التذكيرات المعلقة (للمهام الخلفية)' })
    getPendingReminders(@Request() req: any) {
        return this.tasksService.getPendingReminders(req.user.companyId);
    }

    // ============ WEBHOOKS ============

    @Post('webhooks')
    @ApiOperation({ summary: 'تسجيل webhook جديد' })
    registerWebhook(
        @Request() req: any,
        @Body() body: {
            name: string;
            url: string;
            events: string[];
            secret?: string;
            isActive?: boolean;
        },
    ) {
        return this.tasksService.registerWebhook(req.user.companyId, req.user.id, body);
    }

    @Get('webhooks')
    @ApiOperation({ summary: 'قائمة Webhooks' })
    getWebhooks(@Request() req: any) {
        return this.tasksService.getWebhooks(req.user.companyId);
    }

    @Patch('webhooks/:webhookId')
    @ApiOperation({ summary: 'تحديث webhook' })
    @ApiParam({ name: 'webhookId', description: 'معرف Webhook' })
    updateWebhook(
        @Request() req: any,
        @Param('webhookId') webhookId: string,
        @Body() body: Partial<{
            name: string;
            url: string;
            events: string[];
            isActive: boolean;
        }>,
    ) {
        return this.tasksService.updateWebhook(req.user.companyId, webhookId, body);
    }

    @Delete('webhooks/:webhookId')
    @ApiOperation({ summary: 'حذف webhook' })
    @ApiParam({ name: 'webhookId', description: 'معرف Webhook' })
    deleteWebhook(@Request() req: any, @Param('webhookId') webhookId: string) {
        return this.tasksService.deleteWebhook(req.user.companyId, webhookId);
    }

    // ============ CALENDAR EXPORT ============

    @Get('export/ical')
    @ApiOperation({ summary: 'تصدير المهام بصيغة iCal' })
    @ApiQuery({ name: 'assigneeId', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    exportToIcal(
        @Request() req: any,
        @Query('assigneeId') assigneeId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.exportToIcal(req.user.companyId, req.user.id, {
            assigneeId,
            categoryId,
            startDate,
            endDate,
        });
    }

    // ============ NOTIFICATION PREFERENCES ============

    @Get('notifications/preferences')
    @ApiOperation({ summary: 'تفضيلات الإشعارات' })
    getNotificationPreferences(@Request() req: any) {
        return this.tasksService.getNotificationPreferences(req.user.companyId, req.user.id);
    }

    @Patch('notifications/preferences')
    @ApiOperation({ summary: 'تحديث تفضيلات الإشعارات' })
    updateNotificationPreferences(@Request() req: any, @Body() body: any) {
        return this.tasksService.updateNotificationPreferences(req.user.companyId, req.user.id, body);
    }

    // ============ DIGEST & REPORTS ============

    @Get('digest/daily')
    @ApiOperation({ summary: 'الملخص اليومي للمهام' })
    getDailyDigest(@Request() req: any) {
        return this.tasksService.generateDailyDigest(req.user.companyId, req.user.id);
    }

    @Get('reports/weekly')
    @ApiOperation({ summary: 'التقرير الأسبوعي' })
    @ApiQuery({ name: 'userId', required: false })
    getWeeklyReport(@Request() req: any, @Query('userId') userId?: string) {
        return this.tasksService.generateWeeklyReport(req.user.companyId, userId);
    }

    // ============ EXPORT ============

    @Get('export/json')
    @ApiOperation({ summary: 'تصدير المهام JSON' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'assigneeId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    exportToJson(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('categoryId') categoryId?: string,
        @Query('assigneeId') assigneeId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.exportTasksToJson(req.user.companyId, {
            status,
            categoryId,
            assigneeId,
            startDate,
            endDate,
        });
    }

    @Get('export/csv')
    @ApiOperation({ summary: 'تصدير المهام CSV' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'assigneeId', required: false })
    exportToCsv(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('categoryId') categoryId?: string,
        @Query('assigneeId') assigneeId?: string,
    ) {
        return this.tasksService.exportTasksToCsv(req.user.companyId, {
            status,
            categoryId,
            assigneeId,
        });
    }

    // ============ EXTERNAL INTEGRATIONS ============

    @Post(':id/share/slack')
    @ApiOperation({ summary: 'مشاركة المهمة على Slack' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    shareToSlack(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { webhookUrl: string },
    ) {
        return this.tasksService.sendToSlack(id, req.user.companyId, body.webhookUrl);
    }

    @Get(':id/card/teams')
    @ApiOperation({ summary: 'بطاقة Microsoft Teams' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getTeamsCard(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.generateTeamsCard(id, req.user.companyId);
    }

    // ============ SUBSCRIPTIONS ============

    @Post(':id/subscribe')
    @ApiOperation({ summary: 'الاشتراك في تحديثات المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    subscribeToTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body?: {
            emailOnUpdate?: boolean;
            emailOnComment?: boolean;
            emailOnStatusChange?: boolean;
        },
    ) {
        return this.tasksService.subscribeToTask(id, req.user.companyId, req.user.id, body || {});
    }

    @Delete(':id/subscribe')
    @ApiOperation({ summary: 'إلغاء الاشتراك' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    unsubscribeFromTask(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.unsubscribeFromTask(id, req.user.companyId, req.user.id);
    }

    @Get('subscriptions/my')
    @ApiOperation({ summary: 'اشتراكاتي' })
    getMySubscriptions(@Request() req: any) {
        return this.tasksService.getUserSubscriptions(req.user.companyId, req.user.id);
    }

    // ============ BATCH 5: ADVANCED REPORTS & ANALYTICS ============

    @Get('analytics/dashboard')
    @ApiOperation({ summary: 'لوحة تحليلات المهام' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getDashboardAnalytics(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
        return this.tasksService.getDashboardAnalytics(req.user.companyId, dateRange);
    }

    @Get('reports/user/:userId')
    @ApiOperation({ summary: 'تقرير أداء موظف' })
    @ApiParam({ name: 'userId', description: 'معرف الموظف' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getUserPerformanceReport(
        @Request() req: any,
        @Param('userId') userId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
        return this.tasksService.getUserPerformanceReport(req.user.companyId, userId, dateRange);
    }

    @Get('reports/categories')
    @ApiOperation({ summary: 'تقرير الفئات' })
    getCategoryReport(@Request() req: any) {
        return this.tasksService.getCategoryReport(req.user.companyId);
    }

    @Get('reports/time-tracking')
    @ApiOperation({ summary: 'تقرير تتبع الوقت' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getTimeTrackingReport(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
        return this.tasksService.getTimeTrackingReport(req.user.companyId, dateRange);
    }

    @Get('reports/overdue')
    @ApiOperation({ summary: 'تحليل المهام المتأخرة' })
    getOverdueAnalysis(@Request() req: any) {
        return this.tasksService.getOverdueAnalysis(req.user.companyId);
    }

    // ============ BATCH 6: TEAM COLLABORATION FEATURES ============

    @Post(':id/discussions')
    @ApiOperation({ summary: 'إنشاء نقاش' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    createDiscussionThread(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { title: string; content: string; isPrivate?: boolean },
    ) {
        return this.tasksService.createDiscussionThread(id, req.user.companyId, req.user.id, body);
    }

    @Post('discussions/:threadId/replies')
    @ApiOperation({ summary: 'إضافة رد على نقاش' })
    @ApiParam({ name: 'threadId', description: 'معرف النقاش' })
    addThreadReply(
        @Request() req: any,
        @Param('threadId') threadId: string,
        @Body() body: { content: string },
    ) {
        return this.tasksService.addThreadReply(threadId, req.user.companyId, req.user.id, body.content);
    }

    @Post(':id/mentions')
    @ApiOperation({ summary: 'إشارة لموظفين' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    mentionUsers(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { userIds: string[]; message: string },
    ) {
        return this.tasksService.mentionUsers(id, req.user.companyId, req.user.id, body.userIds, body.message);
    }

    @Post(':id/share')
    @ApiOperation({ summary: 'مشاركة خارجية' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    shareTaskExternally(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { email: string; message?: string; permissions: 'VIEW' | 'COMMENT'; expiresAt?: string },
    ) {
        return this.tasksService.shareTaskExternally(id, req.user.companyId, req.user.id, body);
    }

    @Get('shared/:token')
    @ApiOperation({ summary: 'عرض مهمة مشاركة' })
    @ApiParam({ name: 'token', description: 'رمز المشاركة' })
    getSharedTask(@Param('token') token: string) {
        return this.tasksService.getSharedTask(token);
    }

    @Post(':id/polls')
    @ApiOperation({ summary: 'إنشاء استطلاع' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    createTaskPoll(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            question: string;
            options: string[];
            allowMultiple?: boolean;
            endsAt?: string;
        },
    ) {
        return this.tasksService.createTaskPoll(id, req.user.companyId, req.user.id, body);
    }

    @Post('polls/:pollId/vote')
    @ApiOperation({ summary: 'التصويت في استطلاع' })
    @ApiParam({ name: 'pollId', description: 'معرف الاستطلاع' })
    voteOnPoll(
        @Request() req: any,
        @Param('pollId') pollId: string,
        @Body() body: { optionIds: string[] },
    ) {
        return this.tasksService.voteOnPoll(pollId, req.user.companyId, req.user.id, body.optionIds);
    }

    @Get('activity-feed')
    @ApiOperation({ summary: 'موجز النشاط' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    @ApiQuery({ name: 'userId', required: false })
    getTeamActivityFeed(
        @Request() req: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('userId') userId?: string,
    ) {
        return this.tasksService.getTeamActivityFeed(req.user.companyId, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            userId,
        });
    }

    @Post(':id/favorites')
    @ApiOperation({ summary: 'إضافة للمفضلة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    addToFavorites(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.addToFavorites(id, req.user.companyId, req.user.id);
    }

    @Get('favorites/my')
    @ApiOperation({ summary: 'مهامي المفضلة' })
    getFavoriteTasks(@Request() req: any) {
        return this.tasksService.getFavoriteTasks(req.user.companyId, req.user.id);
    }

    // ============ BATCH 7: ADVANCED WORKFLOW & PERMISSIONS ============

    @Post('workflows')
    @ApiOperation({ summary: 'إنشاء قاعدة سير عمل' })
    createWorkflowRule(
        @Request() req: any,
        @Body() body: {
            name: string;
            description?: string;
            trigger: {
                event: 'TASK_CREATED' | 'STATUS_CHANGED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'DUE_DATE_PASSED' | 'PRIORITY_CHANGED' | 'COMMENT_ADDED';
                conditions?: Record<string, any>;
            };
            actions: Array<{
                type: 'CHANGE_STATUS' | 'ASSIGN_USER' | 'ADD_WATCHER' | 'SEND_NOTIFICATION' | 'SEND_EMAIL' | 'SET_PRIORITY' | 'CREATE_SUBTASK';
                config: Record<string, any>;
            }>;
            isActive?: boolean;
        },
    ) {
        return this.tasksService.createWorkflowRule(req.user.companyId, req.user.id, body);
    }

    @Get('workflows')
    @ApiOperation({ summary: 'قواعد سير العمل' })
    getWorkflowRules(@Request() req: any) {
        return this.tasksService.getWorkflowRules(req.user.companyId);
    }

    @Patch('workflows/:ruleId')
    @ApiOperation({ summary: 'تحديث قاعدة سير عمل' })
    @ApiParam({ name: 'ruleId', description: 'معرف القاعدة' })
    updateWorkflowRule(
        @Request() req: any,
        @Param('ruleId') ruleId: string,
        @Body() body: Partial<{
            name: string;
            description: string;
            isActive: boolean;
            trigger: { event: string; conditions?: Record<string, any> };
            actions: Array<{ type: string; config: Record<string, any> }>;
        }>,
    ) {
        return this.tasksService.updateWorkflowRule(ruleId, req.user.companyId, body);
    }

    @Post('approval-workflows')
    @ApiOperation({ summary: 'إنشاء سلسلة موافقات' })
    createApprovalWorkflow(
        @Request() req: any,
        @Body() body: {
            name: string;
            description?: string;
            stages: Array<{
                name: string;
                approvers: string[];
                requireAll?: boolean;
            }>;
        },
    ) {
        return this.tasksService.createApprovalWorkflow(req.user.companyId, req.user.id, body);
    }

    @Get('approval-workflows')
    @ApiOperation({ summary: 'سلاسل الموافقات' })
    getApprovalWorkflows(@Request() req: any) {
        return this.tasksService.getApprovalWorkflows(req.user.companyId);
    }

    @Post(':id/submit-approval')
    @ApiOperation({ summary: 'تقديم للموافقة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    submitForApproval(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { workflowId: string },
    ) {
        return this.tasksService.submitForApproval(id, req.user.companyId, req.user.id, body.workflowId);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'معالجة الموافقة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    processApproval(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { approved: boolean; comment?: string },
    ) {
        return this.tasksService.processApproval(id, req.user.companyId, req.user.id, body);
    }

    @Put(':id/permissions')
    @ApiOperation({ summary: 'تعيين صلاحيات المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    setTaskPermissions(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            viewUsers?: string[];
            editUsers?: string[];
            viewRoles?: string[];
            editRoles?: string[];
            isPublic?: boolean;
        },
    ) {
        return this.tasksService.setTaskPermissions(id, req.user.companyId, req.user.id, body);
    }

    @Get(':id/permissions/check')
    @ApiOperation({ summary: 'فحص صلاحية' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiQuery({ name: 'action', required: true })
    checkTaskPermission(
        @Request() req: any,
        @Param('id') id: string,
        @Query('action') action: 'VIEW' | 'EDIT' | 'DELETE',
    ) {
        return this.tasksService.checkTaskPermission(id, req.user.companyId, req.user.id, action);
    }

    @Post(':id/delegate')
    @ApiOperation({ summary: 'تفويض المهمة' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    delegateTask(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            toUserId: string;
            reason?: string;
            keepOriginalAssignee?: boolean;
            notifyOriginal?: boolean;
        },
    ) {
        return this.tasksService.delegateTask(id, req.user.companyId, req.user.id, body);
    }

    // ============ BATCH 8: MOBILE & API ENHANCEMENTS ============

    @Get('mobile/list')
    @ApiOperation({ summary: 'قائمة المهام للموبايل' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'assignedToMe', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'cursor', required: false })
    getMobileTaskList(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('assignedToMe') assignedToMe?: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        return this.tasksService.getMobileTaskList(req.user.companyId, req.user.id, {
            status,
            assignedToMe: assignedToMe === 'true',
            limit: limit ? parseInt(limit) : undefined,
            cursor,
        });
    }

    @Get('mobile/:id')
    @ApiOperation({ summary: 'تفاصيل المهمة للموبايل' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getMobileTaskDetail(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getMobileTaskDetail(id, req.user.companyId);
    }

    @Post('mobile/:id/action')
    @ApiOperation({ summary: 'إجراء سريع للموبايل' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    mobileQuickAction(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { type: 'START' | 'COMPLETE' | 'PAUSE' | 'ADD_COMMENT' | 'CHECK_ITEM'; data?: any },
    ) {
        return this.tasksService.mobileQuickAction(id, req.user.companyId, req.user.id, body);
    }

    @Get('sync')
    @ApiOperation({ summary: 'مزامنة المهام' })
    @ApiQuery({ name: 'lastSyncAt', required: false })
    syncTasks(@Request() req: any, @Query('lastSyncAt') lastSyncAt?: string) {
        return this.tasksService.syncTasks(req.user.companyId, req.user.id, lastSyncAt);
    }

    @Post('push-token')
    @ApiOperation({ summary: 'تسجيل رمز الإشعارات' })
    registerPushToken(
        @Request() req: any,
        @Body() body: { deviceId: string; pushToken: string; platform: 'IOS' | 'ANDROID' | 'WEB'; deviceName?: string },
    ) {
        return this.tasksService.registerPushToken(req.user.id, req.user.companyId, body);
    }

    @Post('fields')
    @ApiOperation({ summary: 'جلب المهام مع اختيار الحقول' })
    getTasksWithFields(
        @Request() req: any,
        @Body() body: { fields: string[]; filters?: Record<string, any>; page?: number; limit?: number },
    ) {
        return this.tasksService.getTasksWithFields(req.user.companyId, body);
    }

    @Get('api/health')
    @ApiOperation({ summary: 'حالة API المهام' })
    getApiHealth(@Request() req: any) {
        return this.tasksService.getApiHealth(req.user.companyId);
    }

    // ============ BATCH 9: AI & AUTOMATION FEATURES ============

    @Post('ai/auto-categorize')
    @ApiOperation({ summary: 'تصنيف تلقائي للمهمة' })
    autoCategorizeTask(
        @Request() req: any,
        @Body() body: { title: string; description?: string },
    ) {
        return this.tasksService.autoCategorizeTask(req.user.companyId, body.title, body.description);
    }

    @Get('ai/workload')
    @ApiOperation({ summary: 'اقتراحات توازن الأعباء' })
    getWorkloadSuggestions(@Request() req: any) {
        return this.tasksService.getWorkloadSuggestions(req.user.companyId);
    }

    @Get('ai/predict-due-date')
    @ApiOperation({ summary: 'توقع تاريخ الاستحقاق' })
    @ApiQuery({ name: 'categoryId', required: false })
    @ApiQuery({ name: 'priority', required: false })
    predictDueDate(
        @Request() req: any,
        @Query('categoryId') categoryId?: string,
        @Query('priority') priority?: string,
    ) {
        return this.tasksService.predictDueDate(req.user.companyId, categoryId, priority);
    }

    @Get('ai/similar')
    @ApiOperation({ summary: 'البحث عن مهام مشابهة' })
    @ApiQuery({ name: 'title', required: true })
    @ApiQuery({ name: 'excludeTaskId', required: false })
    findSimilarTasks(
        @Request() req: any,
        @Query('title') title: string,
        @Query('excludeTaskId') excludeTaskId?: string,
    ) {
        return this.tasksService.findSimilarTasks(req.user.companyId, title, excludeTaskId);
    }

    @Post('ai/assignment-recommendation')
    @ApiOperation({ summary: 'اقتراح تعيين الموظف' })
    getAssignmentRecommendation(
        @Request() req: any,
        @Body() body: { categoryId?: string; priority?: string; estimatedHours?: number },
    ) {
        return this.tasksService.getAssignmentRecommendation(req.user.companyId, body);
    }

    @Get('ai/smart-schedule')
    @ApiOperation({ summary: 'جدولة ذكية' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'workHoursPerDay', required: false })
    getSmartSchedule(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('workHoursPerDay') workHoursPerDay?: string,
    ) {
        return this.tasksService.getSmartSchedule(req.user.companyId, req.user.id, {
            startDate,
            endDate,
            workHoursPerDay: workHoursPerDay ? parseInt(workHoursPerDay) : undefined,
        });
    }

    // ============ BATCH 10: ENTERPRISE & COMPLIANCE FEATURES ============

    @Get(':id/audit-trail')
    @ApiOperation({ summary: 'سجل التدقيق' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getTaskAuditTrail(
        @Request() req: any,
        @Param('id') id: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getTaskAuditTrail(id, req.user.companyId, { startDate, endDate });
    }

    @Get('gdpr/export/:userId')
    @ApiOperation({ summary: 'تصدير بيانات المستخدم (GDPR)' })
    @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
    exportUserTaskData(@Request() req: any, @Param('userId') userId: string) {
        return this.tasksService.exportUserTaskData(req.user.companyId, userId);
    }

    @Delete('gdpr/delete/:userId')
    @ApiOperation({ summary: 'حذف بيانات المستخدم (GDPR)' })
    @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
    deleteUserTaskData(
        @Request() req: any,
        @Param('userId') userId: string,
        @Body() body?: { anonymize?: boolean; deleteComments?: boolean; deleteTimeLogs?: boolean },
    ) {
        return this.tasksService.deleteUserTaskData(req.user.companyId, userId, body);
    }

    @Post('retention-policy')
    @ApiOperation({ summary: 'تعيين سياسة الاحتفاظ' })
    setRetentionPolicy(
        @Request() req: any,
        @Body() body: {
            completedTaskRetentionDays: number;
            cancelledTaskRetentionDays: number;
            activityLogRetentionDays: number;
            attachmentRetentionDays: number;
        },
    ) {
        return this.tasksService.setRetentionPolicy(req.user.companyId, req.user.id, body);
    }

    @Post('retention-policy/apply')
    @ApiOperation({ summary: 'تطبيق سياسة الاحتفاظ' })
    applyRetentionPolicy(@Request() req: any) {
        return this.tasksService.applyRetentionPolicy(req.user.companyId);
    }

    @Get(':id/sla')
    @ApiOperation({ summary: 'تتبع SLA' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    getTaskSLA(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.getTaskSLA(id, req.user.companyId);
    }

    @Get('compliance/report')
    @ApiOperation({ summary: 'تقرير الامتثال' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getComplianceReport(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.tasksService.getComplianceReport(req.user.companyId, { startDate, endDate });
    }

    @Post('archive')
    @ApiOperation({ summary: 'أرشفة المهام' })
    archiveTasks(
        @Request() req: any,
        @Body() body: { taskIds: string[]; reason?: string },
    ) {
        return this.tasksService.archiveTasks(req.user.companyId, req.user.id, body.taskIds, body.reason);
    }

    @Post('restore')
    @ApiOperation({ summary: 'استعادة المهام المؤرشفة' })
    restoreArchivedTasks(
        @Request() req: any,
        @Body() body: { taskIds: string[] },
    ) {
        return this.tasksService.restoreArchivedTasks(req.user.companyId, req.user.id, body.taskIds);
    }

    @Put(':id/legal-hold')
    @ApiOperation({ summary: 'تعيين حجز قانوني' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    setLegalHold(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { enabled: boolean; reason?: string; caseReference?: string; expiresAt?: string },
    ) {
        return this.tasksService.setLegalHold(id, req.user.companyId, req.user.id, body);
    }

    @Get('role-templates')
    @ApiOperation({ summary: 'قوالب صلاحيات الأدوار' })
    getRoleAccessTemplates(@Request() req: any) {
        return this.tasksService.getRoleAccessTemplates(req.user.companyId);
    }

    @Post('role-templates')
    @ApiOperation({ summary: 'تعيين قالب صلاحيات' })
    setRoleAccessTemplate(
        @Request() req: any,
        @Body() body: {
            role: string;
            permissions: { view: boolean; edit: boolean; delete: boolean; assign: boolean; approve: boolean };
        },
    ) {
        return this.tasksService.setRoleAccessTemplate(req.user.companyId, req.user.id, body);
    }

    // ============ BATCH 1: DYNAMIC ROUTES (These can stay here since they use :id) ============

    @Post(':id/auto-assign')
    @ApiOperation({ summary: '🎯 تعيين تلقائي للمهمة بناءً على المهارات والعبء' })
    @ApiParam({ name: 'id', description: 'معرف المهمة' })
    autoAssignTask(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.autoAssignTask(id, req.user.companyId);
    }
}


// ============ CATEGORIES CONTROLLER ============

@ApiTags('فئات المهام - Task Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('task-categories')
export class TaskCategoriesController {
    constructor(private readonly tasksService: TasksService) { }

    @Get()
    @ApiOperation({ summary: 'قائمة فئات المهام' })
    findAll(@Request() req: any) {
        return this.tasksService.getCategories(req.user.companyId);
    }

    @Post()
    @ApiOperation({ summary: 'إنشاء فئة جديدة' })
    create(@Request() req: any, @Body() dto: CreateTaskCategoryDto) {
        return this.tasksService.createCategory(req.user.companyId, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'تحديث فئة' })
    @ApiParam({ name: 'id', description: 'معرف الفئة' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskCategoryDto) {
        return this.tasksService.updateCategory(id, req.user.companyId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف فئة' })
    @ApiParam({ name: 'id', description: 'معرف الفئة' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.deleteCategory(id, req.user.companyId);
    }
}

// ============ TEMPLATES CONTROLLER ============

@ApiTags('قوالب المهام - Task Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('task-templates')
export class TaskTemplatesController {
    constructor(private readonly tasksService: TasksService) { }

    @Get()
    @ApiOperation({ summary: 'قائمة قوالب المهام' })
    findAll(@Request() req: any) {
        return this.tasksService.getTemplates(req.user.companyId);
    }

    @Post()
    @ApiOperation({ summary: 'إنشاء قالب جديد' })
    create(@Request() req: any, @Body() dto: CreateTaskTemplateDto) {
        return this.tasksService.createTemplate(req.user.companyId, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'تحديث قالب' })
    @ApiParam({ name: 'id', description: 'معرف القالب' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskTemplateDto) {
        return this.tasksService.updateTemplate(id, req.user.companyId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف قالب' })
    @ApiParam({ name: 'id', description: 'معرف القالب' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.deleteTemplate(id, req.user.companyId);
    }
}

