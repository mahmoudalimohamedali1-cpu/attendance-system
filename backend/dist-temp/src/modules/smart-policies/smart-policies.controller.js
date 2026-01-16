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
exports.SmartPoliciesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const smart_policies_service_1 = require("./smart-policies.service");
const ai_schema_generator_service_1 = require("./ai-schema-generator.service");
const ai_code_generator_service_1 = require("./ai-code-generator.service");
const schema_discovery_service_1 = require("./schema-discovery.service");
const policy_versioning_service_1 = require("./policy-versioning.service");
const policy_approval_service_1 = require("./policy-approval.service");
const policy_simulation_service_1 = require("./policy-simulation.service");
const policy_conflict_service_1 = require("./policy-conflict.service");
const policy_audit_service_1 = require("./policy-audit.service");
const policy_exception_service_1 = require("./policy-exception.service");
const retroactive_policy_service_1 = require("./retroactive-policy.service");
const tiered_penalty_service_1 = require("./tiered-penalty.service");
const payroll_protection_service_1 = require("./payroll-protection.service");
const policy_analytics_service_1 = require("./policy-analytics.service");
const policy_templates_service_1 = require("./policy-templates.service");
const policy_coach_service_1 = require("./policy-coach.service");
const client_1 = require("@prisma/client");
let SmartPoliciesController = class SmartPoliciesController {
    constructor(service, schemaGenerator, codeGenerator, schemaDiscovery, versioningService, approvalService, simulationService, conflictService, auditService, exceptionService, retroService, tieredPenaltyService, payrollProtection, analyticsService, templatesService, coachService) {
        this.service = service;
        this.schemaGenerator = schemaGenerator;
        this.codeGenerator = codeGenerator;
        this.schemaDiscovery = schemaDiscovery;
        this.versioningService = versioningService;
        this.approvalService = approvalService;
        this.simulationService = simulationService;
        this.conflictService = conflictService;
        this.auditService = auditService;
        this.exceptionService = exceptionService;
        this.retroService = retroService;
        this.tieredPenaltyService = tieredPenaltyService;
        this.payrollProtection = payrollProtection;
        this.analyticsService = analyticsService;
        this.templatesService = templatesService;
        this.coachService = coachService;
    }
    async analyzeSchema(body) {
        const analysis = await this.schemaGenerator.analyzePolicy(body.text);
        return { success: true, ...analysis };
    }
    async autoExtend(body) {
        const analysis = await this.schemaGenerator.analyzePolicy(body.text);
        if (analysis.canExecute) {
            return {
                success: true,
                message: 'السياسة يمكن تنفيذها بالحقول الحالية',
                needsExtension: false
            };
        }
        if (!body.confirm) {
            return {
                success: true,
                needsExtension: true,
                message: 'السياسة تحتاج حقول جديدة. أرسل confirm: true للمتابعة',
                missingFields: analysis.missingFields,
                suggestedModels: analysis.suggestedModels.map(m => ({
                    name: m.name,
                    fields: m.fields
                }))
            };
        }
        const addedModels = [];
        const frontendPages = [];
        const errors = [];
        for (const model of analysis.suggestedModels) {
            try {
                const result = await this.schemaGenerator.addModelToSchema(model);
                if (result.success) {
                    addedModels.push(model.name);
                    try {
                        const fullStackResult = await this.codeGenerator.createFullStack(model.name, model.fields.map(f => f.name));
                        if (fullStackResult.frontend.success) {
                            frontendPages.push(model.name);
                        }
                    }
                    catch (codeError) {
                        console.error(`Failed to create full stack for ${model.name}:`, codeError);
                        errors.push(`فشل إنشاء الـ code لـ ${model.name}`);
                    }
                }
                else {
                    errors.push(`فشل إضافة ${model.name} للـ schema`);
                }
            }
            catch (modelError) {
                console.error(`Failed to add model ${model.name}:`, modelError);
                errors.push(`خطأ في إضافة ${model.name}: ${modelError.message || 'unknown error'}`);
            }
        }
        if (addedModels.length > 0) {
            try {
                await this.schemaGenerator.runMigration(`add_${addedModels.join('_')}`);
            }
            catch (migrationError) {
                console.error('Migration failed:', migrationError);
                errors.push(`فشل الـ migration: ${migrationError.message || 'unknown error'}`);
            }
            this.schemaDiscovery.invalidateCache();
        }
        return {
            success: errors.length === 0,
            needsExtension: true,
            extended: addedModels.length > 0,
            addedModels,
            frontendPages,
            errors: errors.length > 0 ? errors : undefined,
            message: addedModels.length > 0
                ? `🎉 تم إضافة ${addedModels.length} modules + ${frontendPages.length} صفحات frontend: ${addedModels.join(', ')}`
                : `❌ فشل التوسيع: ${errors.join(', ')}`
        };
    }
    async getAvailableFields() {
        const fields = [
            { category: 'الموظف', fields: ['employee.tenure.years', 'employee.tenure.months', 'employee.isSaudi', 'employee.department'] },
            { category: 'العقد', fields: ['contract.basicSalary', 'contract.totalSalary', 'contract.isProbation'] },
            { category: 'الحضور', fields: ['attendance.currentPeriod.presentDays', 'attendance.currentPeriod.absentDays', 'attendance.currentPeriod.lateDays', 'attendance.currentPeriod.lateMinutes', 'attendance.currentPeriod.overtimeHours', 'attendance.currentPeriod.attendancePercentage'] },
            { category: 'الإجازات', fields: ['leaves.currentMonth.sickDays', 'leaves.currentMonth.annualDays', 'leaves.balance.annual'] },
            { category: 'العهد والسلف', fields: ['custody.active', 'custody.lateReturns', 'advances.hasActiveAdvance', 'advances.remainingAmount'] },
            { category: 'التأديب', fields: ['disciplinary.activeCases', 'disciplinary.activeWarnings'] },
            { category: 'الموقع', fields: ['location.minutesOutsideGeofence', 'location.excessMinutes', 'location.exceededAllowedTime'] },
            { category: 'الأداء', fields: ['performance.targetAchievement', 'performance.isAbove100', 'performance.isAbove105', 'performance.achievementLevel'] },
            { category: 'مخصصة', fields: ['customFields.*'] },
        ];
        return { success: true, data: fields };
    }
    async getApprovalQueue(user) {
        const result = await this.approvalService.getApprovalQueue(user.companyId);
        return { success: true, ...result };
    }
    async analyze(body) {
        const parsedRule = await this.service.analyzePolicy(body.text);
        return { success: true, parsedRule };
    }
    async quickCreate(body, user) {
        const result = await this.service.createAndActivate(user.companyId, body.text, user.id);
        return {
            success: true,
            ...result
        };
    }
    async create(dto, user) {
        const policy = await this.service.create(user.companyId, dto, user.id);
        return { success: true, data: policy };
    }
    async findAll(user, status, triggerEvent, isActive, page, limit) {
        return await this.service.findAll(user.companyId, {
            status,
            triggerEvent,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    async findOne(id) {
        const policy = await this.service.findOne(id);
        return { success: true, data: policy };
    }
    async update(id, dto, user) {
        await this.versioningService.createVersion(id, user.id, `${user.firstName} ${user.lastName}`, 'تحديث السياسة');
        const policy = await this.service.update(id, dto, user.id);
        return { success: true, data: policy };
    }
    async delete(id) {
        await this.service.delete(id);
        return { success: true, message: 'تم حذف السياسة بنجاح' };
    }
    async activate(id, user) {
        const policy = await this.service.toggleActive(id, true, user.id);
        return { success: true, data: policy, message: 'تم تفعيل السياسة' };
    }
    async deactivate(id, user) {
        const policy = await this.service.toggleActive(id, false, user.id);
        return { success: true, data: policy, message: 'تم إيقاف السياسة' };
    }
    async getVersionHistory(id, page, limit) {
        const result = await this.versioningService.getVersionHistory(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return { success: true, ...result };
    }
    async getVersion(id, version) {
        const versionData = await this.versioningService.getVersion(id, parseInt(version, 10));
        return { success: true, data: versionData };
    }
    async revertToVersion(id, version, user) {
        const policy = await this.versioningService.revertToVersion(id, parseInt(version, 10), user.id, `${user.firstName} ${user.lastName}`);
        return { success: true, data: policy, message: `تم استعادة الإصدار ${version}` };
    }
    async submitForApproval(id, body, user) {
        const result = await this.approvalService.submitForApproval(id, user.id, `${user.firstName} ${user.lastName}`, body.notes);
        return { success: true, ...result };
    }
    async approve(id, body, user) {
        const result = await this.approvalService.approve(id, user.id, `${user.firstName} ${user.lastName}`, body.notes, body.activateNow);
        return { success: true, ...result };
    }
    async reject(id, body, user) {
        const result = await this.approvalService.reject(id, user.id, `${user.firstName} ${user.lastName}`, body.reason);
        return { success: true, ...result };
    }
    async getApprovalHistory(id) {
        const result = await this.approvalService.getApprovalHistory(id);
        return { success: true, ...result };
    }
    async simulate(id, body, user) {
        let result;
        if (body.employeeIds && body.employeeIds.length > 0) {
            result = await this.simulationService.simulateForEmployees(id, body.employeeIds, body.period, user.id, `${user.firstName} ${user.lastName}`);
        }
        else {
            result = await this.simulationService.simulate(id, body.period, user.id, `${user.firstName} ${user.lastName}`);
        }
        return { success: true, ...result };
    }
    async getSimulationHistory(id, page, limit) {
        const result = await this.simulationService.getSimulationHistory(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        return { success: true, ...result };
    }
    async detectConflicts(id) {
        const result = await this.conflictService.detectConflicts(id);
        return { success: true, ...result };
    }
    async canActivate(id) {
        const result = await this.conflictService.validateBeforeActivation(id);
        return { success: true, ...result };
    }
    async getConflictMatrix(user) {
        const result = await this.conflictService.getConflictMatrix(user.companyId);
        return { success: true, ...result };
    }
    async getAuditLog(id, page, limit) {
        const result = await this.auditService.getAuditLogForPolicy(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return { success: true, ...result };
    }
    async getCompanyAuditLog(user, page, limit) {
        const result = await this.auditService.getCompanyAuditLog(user.companyId, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 50,
        });
        return { success: true, ...result };
    }
    async getStats(user) {
        const [total, active, draft, paused, pending] = await Promise.all([
            this.service.findAll(user.companyId, { limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: client_1.SmartPolicyStatus.ACTIVE, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: client_1.SmartPolicyStatus.DRAFT, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: client_1.SmartPolicyStatus.PAUSED, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: client_1.SmartPolicyStatus.PENDING, limit: 1 }).then(r => r.pagination.total),
        ]);
        return {
            success: true,
            data: {
                total,
                active,
                draft,
                paused,
                pending,
            },
        };
    }
    async createException(id, dto, user) {
        const exception = await this.exceptionService.create(user.companyId, { ...dto, policyId: id }, user.id, `${user.firstName} ${user.lastName}`);
        return { success: true, data: exception };
    }
    async getExceptions(id) {
        const exceptions = await this.exceptionService.findByPolicy(id);
        return { success: true, data: exceptions };
    }
    async deleteException(exceptionId) {
        await this.exceptionService.delete(exceptionId);
        return { success: true, message: 'تم حذف الاستثناء' };
    }
    async getExceptionStats(id) {
        const stats = await this.exceptionService.getExceptionStats(id);
        return { success: true, data: stats };
    }
    async createRetroApplication(id, body, user) {
        const application = await this.retroService.createApplication(user.companyId, { policyId: id, ...body }, user.id, `${user.firstName} ${user.lastName}`);
        return { success: true, data: application };
    }
    async calculateRetroApplication(appId) {
        const result = await this.retroService.calculate(appId);
        return { success: true, data: result };
    }
    async approveRetroApplication(appId, user) {
        const result = await this.retroService.approve(appId, user.id, `${user.firstName} ${user.lastName}`);
        return { success: true, data: result };
    }
    async applyRetroApplication(appId, body) {
        const result = await this.retroService.apply(appId, body.targetPayrollPeriod);
        return { success: true, data: result };
    }
    async getRetroApplications(user) {
        const applications = await this.retroService.findByCompany(user.companyId);
        return { success: true, data: applications };
    }
    async getPolicyRetroApplications(id) {
        const applications = await this.retroService.findByPolicy(id);
        return { success: true, data: applications };
    }
    async getOccurrenceStats(id) {
        const stats = await this.tieredPenaltyService.getOccurrenceStats(id);
        return { success: true, data: stats };
    }
    async resetOccurrences(id) {
        const count = await this.tieredPenaltyService.resetAllForPolicy(id);
        return { success: true, message: `تم إعادة تعيين ${count} عداد` };
    }
    async getEmployeeOccurrences(employeeId) {
        const history = await this.tieredPenaltyService.getEmployeeOccurrenceHistory(employeeId);
        return { success: true, data: history };
    }
    async getPayrollLockStatus(user, year, month) {
        const result = await this.payrollProtection.isPayrollPeriodLocked(user.companyId, year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined);
        return { success: true, data: result };
    }
    async getRecentPeriodsLockStatus(user) {
        const periods = await this.payrollProtection.getRecentPeriodsLockStatus(user.companyId);
        return { success: true, data: periods };
    }
    async canApplyRetro(user, startPeriod, endPeriod) {
        const result = await this.payrollProtection.canApplyRetroactively(user.companyId, startPeriod, endPeriod);
        return { success: true, data: result };
    }
    async getAnalyticsDashboard(user, startDate, endDate) {
        const dateRange = startDate && endDate ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        } : undefined;
        const analytics = await this.analyticsService.getAnalytics(user.companyId, dateRange);
        return { success: true, data: analytics };
    }
    async getPolicyHealthScore(id) {
        const healthScore = await this.analyticsService.getPolicyHealthScore(id);
        return { success: true, data: healthScore };
    }
    async validatePolicy(body) {
        const validation = await this.coachService.validateAgainstLaborLaw(body.text, body.parsedRule);
        return { success: true, data: validation };
    }
    async getPolicySuggestions(id) {
        const suggestions = await this.coachService.suggestOptimizations(id);
        return { success: true, data: suggestions };
    }
    async analyzePatterns(user) {
        const patterns = await this.coachService.analyzePatterns(user.companyId);
        return { success: true, data: patterns };
    }
    async getRecommendations(user) {
        const recommendations = await this.coachService.recommendPolicies(user.companyId);
        return { success: true, data: recommendations };
    }
    async getTemplates(category, search) {
        const templates = await this.templatesService.getTemplates({ category, search });
        return { success: true, data: templates };
    }
    async getTemplate(templateId) {
        const template = await this.templatesService.getTemplate(templateId);
        return { success: true, data: template };
    }
    async useTemplate(templateId, user) {
        const result = await this.templatesService.useTemplate(templateId, user.companyId, user.id);
        return { success: true, data: result };
    }
    async rateTemplate(templateId, body) {
        const result = await this.templatesService.rateTemplate(templateId, body.rating);
        return { success: true, data: result };
    }
    async getTemplateCategories() {
        const categories = await this.templatesService.getCategories();
        return { success: true, data: categories };
    }
    async seedTemplates() {
        const result = await this.templatesService.seedTemplates();
        return { success: true, data: result };
    }
};
exports.SmartPoliciesController = SmartPoliciesController;
__decorate([
    (0, common_1.Post)('analyze-schema'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل السياسة واكتشاف الحقول الناقصة' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "analyzeSchema", null);
__decorate([
    (0, common_1.Post)('auto-extend'),
    (0, swagger_1.ApiOperation)({ summary: 'توسيع النظام تلقائياً - يضيف الجداول والـ Code والـ Frontend الناقص' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "autoExtend", null);
__decorate([
    (0, common_1.Get)('available-fields'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة كل الحقول المتاحة في النظام' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getAvailableFields", null);
__decorate([
    (0, common_1.Get)('approval-queue'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة السياسات المعلقة للموافقة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getApprovalQueue", null);
__decorate([
    (0, common_1.Post)('analyze'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل نص السياسة بالذكاء الاصطناعي - معاينة فقط' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "analyze", null);
__decorate([
    (0, common_1.Post)('quick-create'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء وتفعيل سياسة ذكية من نص عربي - بخطوة واحدة' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "quickCreate", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء سياسة ذكية جديدة من نص طبيعي' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة السياسات الذكية' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.SmartPolicyStatus }),
    (0, swagger_1.ApiQuery)({ name: 'triggerEvent', required: false, enum: client_1.SmartPolicyTrigger }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('triggerEvent')),
    __param(3, (0, common_1.Query)('isActive')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل سياسة ذكية' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تحديث سياسة ذكية' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف سياسة ذكية' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'تفعيل سياسة ذكية' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/deactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'إيقاف سياسة ذكية' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)(':id/versions'),
    (0, swagger_1.ApiOperation)({ summary: 'تاريخ إصدارات السياسة' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getVersionHistory", null);
__decorate([
    (0, common_1.Get)(':id/versions/:version'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل إصدار معين' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getVersion", null);
__decorate([
    (0, common_1.Post)(':id/revert/:version'),
    (0, swagger_1.ApiOperation)({ summary: 'استعادة إصدار سابق من السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('version')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "revertToVersion", null);
__decorate([
    (0, common_1.Post)(':id/submit-for-approval'),
    (0, swagger_1.ApiOperation)({ summary: 'إرسال السياسة للموافقة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "submitForApproval", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'رفض السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)(':id/approvals'),
    (0, swagger_1.ApiOperation)({ summary: 'تاريخ الموافقات للسياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getApprovalHistory", null);
__decorate([
    (0, common_1.Post)(':id/simulate'),
    (0, swagger_1.ApiOperation)({ summary: 'محاكاة تأثير السياسة على الموظفين' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "simulate", null);
__decorate([
    (0, common_1.Get)(':id/simulations'),
    (0, swagger_1.ApiOperation)({ summary: 'تاريخ المحاكاة للسياسة' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getSimulationHistory", null);
__decorate([
    (0, common_1.Get)(':id/conflicts'),
    (0, swagger_1.ApiOperation)({ summary: 'اكتشاف التعارضات مع السياسات الأخرى' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "detectConflicts", null);
__decorate([
    (0, common_1.Get)(':id/can-activate'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من إمكانية تفعيل السياسة بدون تعارضات' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "canActivate", null);
__decorate([
    (0, common_1.Get)('conflict-matrix'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض مصفوفة التعارضات لجميع السياسات' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getConflictMatrix", null);
__decorate([
    (0, common_1.Get)(':id/audit-log'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل التدقيق للسياسة' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('company-audit-log'),
    (0, swagger_1.ApiOperation)({ summary: 'سجل التدقيق الشامل لجميع السياسات' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getCompanyAuditLog", null);
__decorate([
    (0, common_1.Get)('stats/overview'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات السياسات الذكية' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(':id/exceptions'),
    (0, swagger_1.ApiOperation)({ summary: 'إضافة استثناء (موظف/قسم/فرع) من السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "createException", null);
__decorate([
    (0, common_1.Get)(':id/exceptions'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة الاستثناءات لسياسة معينة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getExceptions", null);
__decorate([
    (0, common_1.Delete)('exceptions/:exceptionId'),
    (0, swagger_1.ApiOperation)({ summary: 'حذف استثناء' }),
    __param(0, (0, common_1.Param)('exceptionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "deleteException", null);
__decorate([
    (0, common_1.Get)(':id/exceptions/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الاستثناءات' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getExceptionStats", null);
__decorate([
    (0, common_1.Post)(':id/retro-apply'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب تطبيق السياسة بأثر رجعي' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "createRetroApplication", null);
__decorate([
    (0, common_1.Post)('retro-applications/:appId/calculate'),
    (0, swagger_1.ApiOperation)({ summary: 'حساب الأثر الرجعي للطلب' }),
    __param(0, (0, common_1.Param)('appId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "calculateRetroApplication", null);
__decorate([
    (0, common_1.Post)('retro-applications/:appId/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'الموافقة على طلب التطبيق الرجعي' }),
    __param(0, (0, common_1.Param)('appId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "approveRetroApplication", null);
__decorate([
    (0, common_1.Post)('retro-applications/:appId/apply'),
    (0, swagger_1.ApiOperation)({ summary: 'تنفيذ التطبيق الرجعي وإنشاء سجلات RetroPay' }),
    __param(0, (0, common_1.Param)('appId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "applyRetroApplication", null);
__decorate([
    (0, common_1.Get)('retro-applications'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة طلبات التطبيق الرجعي' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getRetroApplications", null);
__decorate([
    (0, common_1.Get)(':id/retro-applications'),
    (0, swagger_1.ApiOperation)({ summary: 'قائمة طلبات التطبيق الرجعي لسياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getPolicyRetroApplications", null);
__decorate([
    (0, common_1.Get)(':id/occurrences/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات تكرار الأحداث للسياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getOccurrenceStats", null);
__decorate([
    (0, common_1.Post)(':id/occurrences/reset'),
    (0, swagger_1.ApiOperation)({ summary: 'إعادة تعيين عدادات التكرار' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "resetOccurrences", null);
__decorate([
    (0, common_1.Get)('occurrences/employee/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'تاريخ التكرار لموظف معين' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getEmployeeOccurrences", null);
__decorate([
    (0, common_1.Get)('payroll-lock/status'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من حالة قفل فترة الرواتب' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getPayrollLockStatus", null);
__decorate([
    (0, common_1.Get)('payroll-lock/recent'),
    (0, swagger_1.ApiOperation)({ summary: 'حالة القفل للفترات الأخيرة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getRecentPeriodsLockStatus", null);
__decorate([
    (0, common_1.Get)('payroll-lock/can-apply-retro'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من إمكانية التطبيق الرجعي للفترة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startPeriod')),
    __param(2, (0, common_1.Query)('endPeriod')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "canApplyRetro", null);
__decorate([
    (0, common_1.Get)('analytics/dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'لوحة التحليلات الشاملة للسياسات' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getAnalyticsDashboard", null);
__decorate([
    (0, common_1.Get)(':id/health'),
    (0, swagger_1.ApiOperation)({ summary: 'مؤشر صحة وفعالية السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getPolicyHealthScore", null);
__decorate([
    (0, common_1.Post)('coach/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'التحقق من توافق السياسة مع نظام العمل السعودي' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "validatePolicy", null);
__decorate([
    (0, common_1.Get)(':id/coach/suggestions'),
    (0, swagger_1.ApiOperation)({ summary: 'اقتراحات المدرب الذكي لتحسين السياسة' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getPolicySuggestions", null);
__decorate([
    (0, common_1.Get)('coach/patterns'),
    (0, swagger_1.ApiOperation)({ summary: 'تحليل أنماط الحضور والغياب للشركة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "analyzePatterns", null);
__decorate([
    (0, common_1.Get)('coach/recommendations'),
    (0, swagger_1.ApiOperation)({ summary: 'سياسات مقترحة بناءً على بيانات الشركة' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('templates/library'),
    (0, swagger_1.ApiOperation)({ summary: 'مكتبة قوالب السياسات' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)('templates/library/:templateId'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل قالب سياسة' }),
    __param(0, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)('templates/library/:templateId/use'),
    (0, swagger_1.ApiOperation)({ summary: 'استخدام قالب لإنشاء سياسة جديدة' }),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "useTemplate", null);
__decorate([
    (0, common_1.Post)('templates/library/:templateId/rate'),
    (0, swagger_1.ApiOperation)({ summary: 'تقييم قالب سياسة' }),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "rateTemplate", null);
__decorate([
    (0, common_1.Get)('templates/categories'),
    (0, swagger_1.ApiOperation)({ summary: 'تصنيفات قوالب السياسات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "getTemplateCategories", null);
__decorate([
    (0, common_1.Post)('templates/seed'),
    (0, swagger_1.ApiOperation)({ summary: 'تهيئة القوالب الأساسية (مرة واحدة)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartPoliciesController.prototype, "seedTemplates", null);
exports.SmartPoliciesController = SmartPoliciesController = __decorate([
    (0, swagger_1.ApiTags)('السياسات الذكية'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('smart-policies'),
    __metadata("design:paramtypes", [smart_policies_service_1.SmartPoliciesService,
        ai_schema_generator_service_1.AiSchemaGeneratorService,
        ai_code_generator_service_1.AiCodeGeneratorService,
        schema_discovery_service_1.SchemaDiscoveryService,
        policy_versioning_service_1.PolicyVersioningService,
        policy_approval_service_1.PolicyApprovalService,
        policy_simulation_service_1.PolicySimulationService,
        policy_conflict_service_1.PolicyConflictService,
        policy_audit_service_1.PolicyAuditService,
        policy_exception_service_1.PolicyExceptionService,
        retroactive_policy_service_1.RetroactivePolicyService,
        tiered_penalty_service_1.TieredPenaltyService,
        payroll_protection_service_1.PayrollProtectionService,
        policy_analytics_service_1.PolicyAnalyticsService,
        policy_templates_service_1.PolicyTemplatesService,
        policy_coach_service_1.PolicyCoachService])
], SmartPoliciesController);
//# sourceMappingURL=smart-policies.controller.js.map