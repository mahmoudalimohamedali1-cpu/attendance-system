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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplatesController = exports.TaskCategoriesController = exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tasks_service_1 = require("./tasks.service");
const create_task_dto_1 = require("./dto/create-task.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const task_query_dto_1 = require("./dto/task-query.dto");
const task_category_dto_1 = require("./dto/task-category.dto");
const task_template_dto_1 = require("./dto/task-template.dto");
const task_actions_dto_1 = require("./dto/task-actions.dto");
const attachmentStorage = (0, multer_1.diskStorage)({
    destination: './uploads/tasks',
    filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, uniqueSuffix + (0, path_1.extname)(file.originalname));
    },
});
let TasksController = class TasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    create(req, dto) {
        return this.tasksService.createTask(req.user.id, req.user.companyId, dto);
    }
    getMyTasks(req) {
        return this.tasksService.getMyTasks(req.user.id, req.user.companyId);
    }
    findAll(req, query) {
        return this.tasksService.getTasks(req.user.companyId, query);
    }
    getKanban(req, categoryId, myTasks) {
        const userId = myTasks === 'true' ? req.user.id : undefined;
        return this.tasksService.getKanbanBoard(req.user.companyId, categoryId, userId);
    }
    getStats(req, myStats) {
        const userId = myStats === 'true' ? req.user.id : undefined;
        return this.tasksService.getTaskStats(req.user.companyId, userId);
    }
    findOne(req, id) {
        return this.tasksService.getTaskById(id, req.user.companyId);
    }
    update(req, id, dto) {
        return this.tasksService.updateTask(id, req.user.companyId, req.user.id, dto);
    }
    remove(req, id) {
        return this.tasksService.deleteTask(id, req.user.companyId, req.user.id);
    }
    reorder(req, id, dto) {
        return this.tasksService.reorderTask(id, req.user.companyId, req.user.id, dto);
    }
    addChecklist(req, id, dto) {
        return this.tasksService.addChecklist(id, req.user.companyId, req.user.id, dto);
    }
    addChecklistItem(req, checklistId, dto) {
        return this.tasksService.addChecklistItem(checklistId, req.user.companyId, req.user.id, dto);
    }
    toggleChecklistItem(req, itemId, dto) {
        return this.tasksService.toggleChecklistItem(itemId, req.user.companyId, req.user.id, dto.isCompleted);
    }
    deleteChecklistItem(req, itemId) {
        return this.tasksService.deleteChecklistItem(itemId, req.user.companyId, req.user.id);
    }
    addComment(req, id, dto) {
        return this.tasksService.addComment(id, req.user.companyId, req.user.id, dto);
    }
    deleteComment(req, commentId) {
        return this.tasksService.deleteComment(commentId, req.user.companyId, req.user.id);
    }
    addTimeLog(req, id, dto) {
        return this.tasksService.addTimeLog(id, req.user.companyId, req.user.id, dto);
    }
    watch(req, id) {
        return this.tasksService.addWatcher(id, req.user.companyId, req.user.id);
    }
    unwatch(req, id) {
        return this.tasksService.removeWatcher(id, req.user.companyId, req.user.id);
    }
    addDependency(req, id, dto) {
        return this.tasksService.addDependency(id, dto.blockingTaskId, req.user.companyId, req.user.id);
    }
    removeDependency(req, id, blockingTaskId) {
        return this.tasksService.removeDependency(id, blockingTaskId, req.user.companyId);
    }
    uploadAttachment(req, id, file) {
        return this.tasksService.addAttachment(id, req.user.companyId, req.user.id, file);
    }
    deleteAttachment(req, attachmentId) {
        return this.tasksService.deleteAttachment(attachmentId, req.user.companyId, req.user.id);
    }
    requestReview(req, id) {
        return this.tasksService.requestReview(id, req.user.companyId, req.user.id);
    }
    startReview(req, id) {
        return this.tasksService.startReview(id, req.user.companyId, req.user.id);
    }
    approveTask(req, id, body) {
        return this.tasksService.approveTask(id, req.user.companyId, req.user.id, body?.comment);
    }
    rejectTask(req, id, body) {
        return this.tasksService.rejectTask(id, req.user.companyId, req.user.id, body.reason);
    }
    requestChanges(req, id, body) {
        return this.tasksService.requestChanges(id, req.user.companyId, req.user.id, body.feedback);
    }
    getApprovalHistory(req, id) {
        return this.tasksService.getApprovalHistory(id, req.user.companyId);
    }
    submitEvidence(req, id, body) {
        return this.tasksService.submitEvidence(id, req.user.companyId, req.user.id, body);
    }
    getEvidences(req, id) {
        return this.tasksService.getEvidences(id, req.user.companyId);
    }
    verifyEvidence(req, evidenceId, body) {
        return this.tasksService.verifyEvidence(evidenceId, req.user.companyId, req.user.id, body.status, body.comment);
    }
    deleteEvidence(req, evidenceId) {
        return this.tasksService.deleteEvidence(evidenceId, req.user.companyId, req.user.id);
    }
    getDependencies(req, id) {
        return this.tasksService.getDependencies(id, req.user.companyId);
    }
    updateDependencyType(req, dependencyId, body) {
        return this.tasksService.updateDependencyType(dependencyId, req.user.companyId, body.type);
    }
    getGanttData(req, categoryId) {
        return this.tasksService.getGanttData(req.user.companyId, categoryId);
    }
    getComments(req, id) {
        return this.tasksService.getComments(id, req.user.companyId);
    }
    replyToComment(req, commentId, body) {
        return this.tasksService.replyToComment(commentId, req.user.companyId, req.user.id, body.content, body.mentions || []);
    }
    addReaction(req, commentId, body) {
        return this.tasksService.addReaction(commentId, req.user.companyId, req.user.id, body.emoji);
    }
    removeReaction(req, commentId, emoji) {
        return this.tasksService.removeReaction(commentId, req.user.companyId, req.user.id, emoji);
    }
    getActivityFeed(req, id, limit) {
        return this.tasksService.getActivityFeed(id, req.user.companyId, limit ? parseInt(limit) : 50);
    }
    getProductivityMetrics(req, startDate, endDate) {
        return this.tasksService.getProductivityMetrics(req.user.companyId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    getTeamPerformance(req, startDate, endDate) {
        return this.tasksService.getTeamPerformance(req.user.companyId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    getTimeAnalytics(req, startDate, endDate) {
        return this.tasksService.getTimeAnalytics(req.user.companyId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    getTaskTrends(req, days) {
        return this.tasksService.getTaskTrends(req.user.companyId, days ? parseInt(days) : 30);
    }
    generateReport(req, body) {
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
    createAutomation(req, body) {
        return this.tasksService.createAutomation(req.user.companyId, req.user.id, body);
    }
    getAutomations(req) {
        return this.tasksService.getAutomations(req.user.companyId);
    }
    updateAutomation(req, id, body) {
        return this.tasksService.updateAutomation(id, req.user.companyId, body);
    }
    deleteAutomation(req, id) {
        return this.tasksService.deleteAutomation(id, req.user.companyId);
    }
    toggleAutomation(req, id) {
        return this.tasksService.toggleAutomation(id, req.user.companyId);
    }
    getAutomationLogs(req, id, limit) {
        return this.tasksService.getAutomationLogs(id, req.user.companyId, limit ? parseInt(limit) : 50);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء مهمة جديدة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_task_dto_1.CreateTaskDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my-tasks'),
    (0, swagger_1.ApiOperation)({ summary: 'مهامي - المهام المسندة لي أو التي أنشأتها' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getMyTasks", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة المهام مع الفلترة والبحث' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, task_query_dto_1.TaskQueryDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('kanban'),
    (0, swagger_1.ApiOperation)({ summary: 'لوحة Kanban للمهام' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'myTasks', required: false, type: Boolean }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('categoryId')),
    __param(2, (0, common_1.Query)('myTasks')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getKanban", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات المهام' }),
    (0, swagger_1.ApiQuery)({ name: 'myStats', required: false, type: Boolean }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('myStats')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل مهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث مهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف مهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/reorder'),
    (0, swagger_1.ApiOperation)({ summary: 'إعادة ترتيب مهمة (Kanban)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.ReorderTaskDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)(':id/checklists'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة قائمة تحقق' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.CreateChecklistDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addChecklist", null);
__decorate([
    (0, common_1.Post)('checklists/:checklistId/items'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة عنصر لقائمة التحقق' }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', description: 'معرف قائمة التحقق' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('checklistId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.CreateChecklistItemDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addChecklistItem", null);
__decorate([
    (0, common_1.Patch)('checklist-items/:itemId/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'تبديل حالة عنصر قائمة التحقق' }),
    (0, swagger_1.ApiParam)({ name: 'itemId', description: 'معرف العنصر' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.ToggleChecklistItemDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "toggleChecklistItem", null);
__decorate([
    (0, common_1.Delete)('checklist-items/:itemId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف عنصر من قائمة التحقق' }),
    (0, swagger_1.ApiParam)({ name: 'itemId', description: 'معرف العنصر' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteChecklistItem", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة تعليق' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.CreateCommentDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addComment", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف تعليق' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', description: 'معرف التعليق' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)(':id/time-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل وقت عمل' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.CreateTimeLogDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addTimeLog", null);
__decorate([
    (0, common_1.Post)(':id/watch'),
    (0, swagger_1.ApiOperation)({ summary: 'متابعة مهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "watch", null);
__decorate([
    (0, common_1.Delete)(':id/watch'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء متابعة مهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "unwatch", null);
__decorate([
    (0, common_1.Post)(':id/dependencies'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة اعتماد (المهمة محظورة بسبب مهمة أخرى)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة المحظورة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_actions_dto_1.AddDependencyDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addDependency", null);
__decorate([
    (0, common_1.Delete)(':id/dependencies/:blockingTaskId'),
    (0, swagger_1.ApiOperation)({ summary: 'إزالة اعتماد' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة المحظورة' }),
    (0, swagger_1.ApiParam)({ name: 'blockingTaskId', description: 'معرف المهمة المانعة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('blockingTaskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "removeDependency", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, swagger_1.ApiOperation)({ summary: 'رفع مرفق للمهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: attachmentStorage })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Delete)('attachments/:attachmentId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف مرفق' }),
    (0, swagger_1.ApiParam)({ name: 'attachmentId', description: 'معرف المرفق' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteAttachment", null);
__decorate([
    (0, common_1.Post)(':id/workflow/request-review'),
    (0, swagger_1.ApiOperation)({ summary: 'طلب مراجعة المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "requestReview", null);
__decorate([
    (0, common_1.Post)(':id/workflow/start-review'),
    (0, swagger_1.ApiOperation)({ summary: 'بدء مراجعة المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "startReview", null);
__decorate([
    (0, common_1.Post)(':id/workflow/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "approveTask", null);
__decorate([
    (0, common_1.Post)(':id/workflow/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "rejectTask", null);
__decorate([
    (0, common_1.Post)(':id/workflow/request-changes'),
    (0, swagger_1.ApiOperation)({ summary: 'طلب تعديلات على المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "requestChanges", null);
__decorate([
    (0, common_1.Get)(':id/workflow/history'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل الموافقات والمراجعات' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getApprovalHistory", null);
__decorate([
    (0, common_1.Post)(':id/evidence'),
    (0, swagger_1.ApiOperation)({ summary: 'تقديم إثبات إنجاز' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "submitEvidence", null);
__decorate([
    (0, common_1.Get)(':id/evidence'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض إثباتات الإنجاز' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getEvidences", null);
__decorate([
    (0, common_1.Post)('evidence/:evidenceId/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'اعتماد أو رفض إثبات الإنجاز' }),
    (0, swagger_1.ApiParam)({ name: 'evidenceId', description: 'معرف الإثبات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('evidenceId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "verifyEvidence", null);
__decorate([
    (0, common_1.Delete)('evidence/:evidenceId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف إثبات الإنجاز' }),
    (0, swagger_1.ApiParam)({ name: 'evidenceId', description: 'معرف الإثبات' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('evidenceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteEvidence", null);
__decorate([
    (0, common_1.Get)(':id/dependencies'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض تبعيات المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getDependencies", null);
__decorate([
    (0, common_1.Patch)('dependencies/:dependencyId/type'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث نوع التبعية' }),
    (0, swagger_1.ApiParam)({ name: 'dependencyId', description: 'معرف التبعية' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('dependencyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "updateDependencyType", null);
__decorate([
    (0, common_1.Get)('gantt'),
    (0, swagger_1.ApiOperation)({ summary: 'بيانات Gantt Chart' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false, description: 'فلترة حسب الفئة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getGanttData", null);
__decorate([
    (0, common_1.Get)(':id/comments/threaded'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض التعليقات مع الردود' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/reply'),
    (0, swagger_1.ApiOperation)({ summary: 'الرد على تعليق' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', description: 'معرف التعليق' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "replyToComment", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/reactions'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة تفاعل على تعليق' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', description: 'معرف التعليق' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId/reactions/:emoji'),
    (0, swagger_1.ApiOperation)({ summary: 'إزالة تفاعل من تعليق' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', description: 'معرف التعليق' }),
    (0, swagger_1.ApiParam)({ name: 'emoji', description: 'الإيموجي' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Param)('emoji')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Get)(':id/activity'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل نشاط المهمة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف المهمة' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'عدد النتائج' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getActivityFeed", null);
__decorate([
    (0, common_1.Get)('analytics/metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الإنتاجية' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getProductivityMetrics", null);
__decorate([
    (0, common_1.Get)('analytics/team'),
    (0, swagger_1.ApiOperation)({ summary: 'أداء الفريق' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getTeamPerformance", null);
__decorate([
    (0, common_1.Get)('analytics/time'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل الوقت المسجل' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getTimeAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/trends'),
    (0, swagger_1.ApiOperation)({ summary: 'اتجاهات المهام' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, description: 'عدد الأيام (افتراضي 30)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getTaskTrends", null);
__decorate([
    (0, common_1.Post)('analytics/report'),
    (0, swagger_1.ApiOperation)({ summary: 'توليد تقرير شامل' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Post)('automations'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء قاعدة أتمتة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "createAutomation", null);
__decorate([
    (0, common_1.Get)('automations'),
    (0, swagger_1.ApiOperation)({ summary: 'قواعد الأتمتة' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getAutomations", null);
__decorate([
    (0, common_1.Patch)('automations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث قاعدة أتمتة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القاعدة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "updateAutomation", null);
__decorate([
    (0, common_1.Delete)('automations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف قاعدة أتمتة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القاعدة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteAutomation", null);
__decorate([
    (0, common_1.Patch)('automations/:id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل/تعطيل قاعدة أتمتة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القاعدة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "toggleAutomation", null);
__decorate([
    (0, common_1.Get)('automations/:id/logs'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل تنفيذ الأتمتة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القاعدة' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "getAutomationLogs", null);
exports.TasksController = TasksController = __decorate([
    (0, swagger_1.ApiTags)('المهام - Tasks'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tasks'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
let TaskCategoriesController = class TaskCategoriesController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    findAll(req) {
        return this.tasksService.getCategories(req.user.companyId);
    }
    create(req, dto) {
        return this.tasksService.createCategory(req.user.companyId, dto);
    }
    update(req, id, dto) {
        return this.tasksService.updateCategory(id, req.user.companyId, dto);
    }
    remove(req, id) {
        return this.tasksService.deleteCategory(id, req.user.companyId);
    }
};
exports.TaskCategoriesController = TaskCategoriesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة فئات المهام' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaskCategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء فئة جديدة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, task_category_dto_1.CreateTaskCategoryDto]),
    __metadata("design:returntype", void 0)
], TaskCategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث فئة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف الفئة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_category_dto_1.UpdateTaskCategoryDto]),
    __metadata("design:returntype", void 0)
], TaskCategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف فئة' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف الفئة' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskCategoriesController.prototype, "remove", null);
exports.TaskCategoriesController = TaskCategoriesController = __decorate([
    (0, swagger_1.ApiTags)('فئات المهام - Task Categories'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('task-categories'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TaskCategoriesController);
let TaskTemplatesController = class TaskTemplatesController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    findAll(req) {
        return this.tasksService.getTemplates(req.user.companyId);
    }
    create(req, dto) {
        return this.tasksService.createTemplate(req.user.companyId, dto);
    }
    update(req, id, dto) {
        return this.tasksService.updateTemplate(id, req.user.companyId, dto);
    }
    remove(req, id) {
        return this.tasksService.deleteTemplate(id, req.user.companyId);
    }
};
exports.TaskTemplatesController = TaskTemplatesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة قوالب المهام' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaskTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء قالب جديد' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, task_template_dto_1.CreateTaskTemplateDto]),
    __metadata("design:returntype", void 0)
], TaskTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث قالب' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القالب' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_template_dto_1.UpdateTaskTemplateDto]),
    __metadata("design:returntype", void 0)
], TaskTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف قالب' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'معرف القالب' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskTemplatesController.prototype, "remove", null);
exports.TaskTemplatesController = TaskTemplatesController = __decorate([
    (0, swagger_1.ApiTags)('قوالب المهام - Task Templates'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('task-templates'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TaskTemplatesController);
//# sourceMappingURL=tasks.controller.js.map