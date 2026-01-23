import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseFilters,
    UsePipes,
    ValidationPipe,
    Res,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SmartPoliciesService } from './smart-policies.service';
import {
    CreateSmartPolicyDto,
    UpdateSmartPolicyDto,
    AnalyzePolicyDto,
    AutoExtendDto,
    SimulatePolicyDto,
    CreatePolicyExceptionDto,
    CreateRetroApplicationDto,
    ApplyRetroDto,
    SubmitForApprovalDto,
    ApprovePolicyDto,
    RejectPolicyDto,
    SyncPayrollDto,
    RateTemplateDto,
    FilterPoliciesDto,
} from './dto/smart-policy.dto';
import { SmartPolicyExceptionFilter } from './filters/smart-policy-exception.filter';
import {
    RateLimitGuard,
    AIRateLimit,
    AutoExtendRateLimit,
    SimulationRateLimit,
    ExportRateLimit,
} from './guards/rate-limit.guard';
import { AiSchemaGeneratorService } from './ai-schema-generator.service';
import { AiCodeGeneratorService } from './ai-code-generator.service';
import { SchemaDiscoveryService } from './schema-discovery.service';
import { PolicyVersioningService } from './policy-versioning.service';
import { PolicyApprovalService } from './policy-approval.service';
import { PolicySimulationService } from './policy-simulation.service';
import { PolicyConflictService } from './policy-conflict.service';
import { PolicyAuditService } from './policy-audit.service';
// === New Enterprise Services ===
import { PolicyExceptionService } from './policy-exception.service';
import { RetroactivePolicyService } from './retroactive-policy.service';
import { TieredPenaltyService } from './tiered-penalty.service';
import { PayrollProtectionService } from './payroll-protection.service';
// === Phase 2: Analytics, Coach & Templates ===
import { PolicyAnalyticsService } from './policy-analytics.service';
import { PolicyTemplatesService } from './policy-templates.service';
import { PolicyCoachService } from './policy-coach.service';
// === Phase 3: Accountant Tools ===
import { AccountantDashboardService } from './accountant-dashboard.service';
import { PayrollPolicyIntegrationService } from './payroll-policy-integration.service';
import { PolicyFinancialReportService } from './policy-financial-report.service';
import { PolicyExportService } from './policy-export.service';
// === Advanced Features ===
import { AIPolicyBuilderService } from './features/ai-policy-builder.service';
import { RealtimeDashboardService } from './features/realtime-dashboard.service';
import { AdvancedAnalyticsService as AdvancedAnalyticsFeatureService } from './features/advanced-analytics.service';
import { SmartNotificationsService } from './features/smart-notifications.service';
import { PolicyWizardService } from './features/policy-wizard.service';
import { IntegrationHubService } from './features/integration-hub.service';
import { AdvancedReportingService } from './features/advanced-reporting.service';
import { PolicyMarketplaceService } from './features/policy-marketplace.service';
import { SmartPolicyStatus, SmartPolicyTrigger } from '@prisma/client';
import { Response } from 'express';

@ApiTags('السياسات الذكية - Smart Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@UseFilters(SmartPolicyExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('smart-policies')
export class SmartPoliciesController {
    constructor(
        private readonly service: SmartPoliciesService,
        private readonly schemaGenerator: AiSchemaGeneratorService,
        private readonly codeGenerator: AiCodeGeneratorService,
        private readonly schemaDiscovery: SchemaDiscoveryService,
        private readonly versioningService: PolicyVersioningService,
        private readonly approvalService: PolicyApprovalService,
        private readonly simulationService: PolicySimulationService,
        private readonly conflictService: PolicyConflictService,
        private readonly auditService: PolicyAuditService,
        // === New Enterprise Services ===
        private readonly exceptionService: PolicyExceptionService,
        private readonly retroService: RetroactivePolicyService,
        private readonly tieredPenaltyService: TieredPenaltyService,
        private readonly payrollProtection: PayrollProtectionService,
        // === Phase 2: Analytics, Coach & Templates ===
        private readonly analyticsService: PolicyAnalyticsService,
        private readonly templatesService: PolicyTemplatesService,
        private readonly coachService: PolicyCoachService,
        // === Phase 3: Accountant Tools ===
        private readonly accountantDashboard: AccountantDashboardService,
        private readonly payrollIntegration: PayrollPolicyIntegrationService,
        private readonly financialReports: PolicyFinancialReportService,
        private readonly exportService: PolicyExportService,
        // === Advanced Features ===
        private readonly aiPolicyBuilder: AIPolicyBuilderService,
        private readonly realtimeDashboard: RealtimeDashboardService,
        private readonly advancedAnalyticsFeature: AdvancedAnalyticsFeatureService,
        private readonly smartNotifications: SmartNotificationsService,
        private readonly policyWizard: PolicyWizardService,
        private readonly integrationHub: IntegrationHubService,
        private readonly advancedReporting: AdvancedReportingService,
        private readonly marketplace: PolicyMarketplaceService,
    ) { }

    /**
     * 🧠 تحليل السياسة واكتشاف الحقول الناقصة
     */
    @Post('analyze-schema')
    @ApiOperation({ summary: 'تحليل السياسة واكتشاف الحقول الناقصة' })
    async analyzeSchema(@Body() body: { text: string }) {
        const analysis = await this.schemaGenerator.analyzePolicy(body.text);
        return { success: true, ...analysis };
    }

    /**
     * 🔥 توسيع النظام تلقائياً
     * يكتشف الحقول الناقصة ويضيفها للـ Database والـ Code
     */
    @Post('auto-extend')
    @ApiOperation({ summary: 'توسيع النظام تلقائياً - يضيف الجداول والـ Code والـ Frontend الناقص' })
    async autoExtend(@Body() body: { text: string; confirm?: boolean }) {
        // 1. تحليل السياسة
        const analysis = await this.schemaGenerator.analyzePolicy(body.text);

        if (analysis.canExecute) {
            return {
                success: true,
                message: 'السياسة يمكن تنفيذها بالحقول الحالية',
                needsExtension: false
            };
        }

        if (!body.confirm) {
            // إرجاع التحليل للمراجعة
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

        // 2. إضافة الـ Models للـ Schema (مع error handling)
        const addedModels: string[] = [];
        const frontendPages: string[] = [];
        const errors: string[] = [];

        for (const model of analysis.suggestedModels) {
            try {
                const result = await this.schemaGenerator.addModelToSchema(model);
                if (result.success) {
                    addedModels.push(model.name);

                    // 3. إنشاء Backend + Frontend (Full Stack!)
                    try {
                        const fullStackResult = await this.codeGenerator.createFullStack(
                            model.name,
                            model.fields.map(f => f.name)
                        );

                        if (fullStackResult.frontend.success) {
                            frontendPages.push(model.name);
                        }
                    } catch (codeError) {
                        console.error(`Failed to create full stack for ${model.name}:`, codeError);
                        errors.push(`فشل إنشاء الـ code لـ ${model.name}`);
                    }
                } else {
                    errors.push(`فشل إضافة ${model.name} للـ schema`);
                }
            } catch (modelError) {
                console.error(`Failed to add model ${model.name}:`, modelError);
                errors.push(`خطأ في إضافة ${model.name}: ${modelError.message || 'unknown error'}`);
            }
        }

        // 4. تشغيل Migration (مع error handling)
        if (addedModels.length > 0) {
            try {
                await this.schemaGenerator.runMigration(`add_${addedModels.join('_')}`);
            } catch (migrationError) {
                console.error('Migration failed:', migrationError);
                errors.push(`فشل الـ migration: ${migrationError.message || 'unknown error'}`);
            }

            // 🔥 SELF-LEARNING: مسح الكاش عشان الحقول الجديدة تتعرف فوراً!
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

    /**
     * قائمة الحقول المتاحة في النظام
     * يمكن استخدامها لمعرفة ما يفهمه النظام
     */
    @Get('available-fields')
    @ApiOperation({ summary: 'قائمة كل الحقول المتاحة في النظام' })
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

    /**
     * 📋 قائمة الموافقات المعلقة
     */
    @Get('approval-queue')
    @ApiOperation({ summary: 'قائمة السياسات المعلقة للموافقة' })
    async getApprovalQueue(@CurrentUser() user: any) {
        const result = await this.approvalService.getApprovalQueue(user.companyId);
        return { success: true, ...result };
    }

    /**
     * تحليل نص السياسة بالذكاء الاصطناعي (معاينة فقط مع فحص الجاهزية)
     */
    @Post('analyze')
    @ApiOperation({ summary: 'تحليل نص السياسة بالذكاء الاصطناعي - معاينة فقط مع فحص الجاهزية' })
    async analyze(@Body() body: { text: string }, @CurrentUser() user: any) {
        const parsedRule = await this.service.analyzePolicy(body.text);

        // فحص الجاهزية تلقائياً
        let feasibility = null;
        try {
            const { PolicyFeasibilityService } = await import('../ai/services/policy-feasibility.service');
            const feasibilityService = new PolicyFeasibilityService(
                (this as any).prisma || require('../../common/prisma/prisma.service').PrismaService,
                (await import('../ai/services/schema-introspector.service')).SchemaIntrospectorService.prototype
            );
            // لو فيه شروط، نحلل الجاهزية
            if (parsedRule.conditions?.length > 0 || parsedRule.dynamicQuery) {
                feasibility = await this.schemaGenerator.analyzeFeasibility(parsedRule, user.companyId);
            }
        } catch (error) {
            console.log('Feasibility check skipped:', error.message);
        }

        return { success: true, parsedRule, feasibility };
    }

    /**
     * إنشاء وتفعيل سياسة ذكية من نص عربي - بخطوة واحدة
     * النظام يفهم النص ويضيفه للسيستم تلقائياً
     */
    @Post('quick-create')
    @ApiOperation({ summary: 'إنشاء وتفعيل سياسة ذكية من نص عربي - بخطوة واحدة' })
    async quickCreate(
        @Body() body: { text: string },
        @CurrentUser() user: any,
    ) {
        const result = await this.service.createAndActivate(
            user.companyId,
            body.text,
            user.id
        );
        return {
            success: true,
            ...result
        };
    }

    /**
     * إنشاء سياسة ذكية جديدة
     */
    @Post()
    @ApiOperation({ summary: 'إنشاء سياسة ذكية جديدة من نص طبيعي' })
    async create(
        @Body() dto: CreateSmartPolicyDto,
        @CurrentUser() user: any,
    ) {
        const policy = await this.service.create(user.companyId, dto, user.id);
        return { success: true, data: policy };
    }

    /**
     * الحصول على جميع السياسات الذكية
     */
    @Get()
    @ApiOperation({ summary: 'قائمة السياسات الذكية' })
    @ApiQuery({ name: 'status', required: false, enum: SmartPolicyStatus })
    @ApiQuery({ name: 'triggerEvent', required: false, enum: SmartPolicyTrigger })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: SmartPolicyStatus,
        @Query('triggerEvent') triggerEvent?: SmartPolicyTrigger,
        @Query('isActive') isActive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return await this.service.findAll(user.companyId, {
            status,
            triggerEvent,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    /**
     * الحصول على سياسة ذكية بالمعرف
     */
    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل سياسة ذكية' })
    async findOne(@Param('id') id: string) {
        const policy = await this.service.findOne(id);
        return { success: true, data: policy };
    }

    /**
     * تحديث سياسة ذكية (مع إنشاء نسخة جديدة)
     */
    @Patch(':id')
    @ApiOperation({ summary: 'تحديث سياسة ذكية' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateSmartPolicyDto,
        @CurrentUser() user: any,
    ) {
        // إنشاء نسخة من الحالة الحالية قبل التعديل
        await this.versioningService.createVersion(
            id,
            user.id,
            `${user.firstName} ${user.lastName}`,
            'تحديث السياسة'
        );

        const policy = await this.service.update(id, dto, user.id);
        return { success: true, data: policy };
    }

    /**
     * حذف سياسة ذكية
     */
    @Delete(':id')
    @ApiOperation({ summary: 'حذف سياسة ذكية' })
    async delete(@Param('id') id: string) {
        await this.service.delete(id);
        return { success: true, message: 'تم حذف السياسة بنجاح' };
    }

    /**
     * تفعيل سياسة ذكية
     */
    @Post(':id/activate')
    @ApiOperation({ summary: 'تفعيل سياسة ذكية' })
    async activate(@Param('id') id: string, @CurrentUser() user: any) {
        const policy = await this.service.toggleActive(id, true, user.id);
        return { success: true, data: policy, message: 'تم تفعيل السياسة' };
    }

    /**
     * إيقاف سياسة ذكية
     */
    @Post(':id/deactivate')
    @ApiOperation({ summary: 'إيقاف سياسة ذكية' })
    async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
        const policy = await this.service.toggleActive(id, false, user.id);
        return { success: true, data: policy, message: 'تم إيقاف السياسة' };
    }

    // ==================== Versioning Endpoints ====================

    /**
     * 📜 جلب تاريخ الإصدارات لسياسة
     */
    @Get(':id/versions')
    @ApiOperation({ summary: 'تاريخ إصدارات السياسة' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getVersionHistory(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.versioningService.getVersionHistory(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return { success: true, ...result };
    }

    /**
     * جلب تفاصيل إصدار معين
     */
    @Get(':id/versions/:version')
    @ApiOperation({ summary: 'تفاصيل إصدار معين' })
    async getVersion(
        @Param('id') id: string,
        @Param('version') version: string,
    ) {
        const versionData = await this.versioningService.getVersion(id, parseInt(version, 10));
        return { success: true, data: versionData };
    }

    /**
     * 🔄 استعادة إصدار سابق
     */
    @Post(':id/revert/:version')
    @ApiOperation({ summary: 'استعادة إصدار سابق من السياسة' })
    async revertToVersion(
        @Param('id') id: string,
        @Param('version') version: string,
        @CurrentUser() user: any,
    ) {
        const policy = await this.versioningService.revertToVersion(
            id,
            parseInt(version, 10),
            user.id,
            `${user.firstName} ${user.lastName}`,
        );
        return { success: true, data: policy, message: `تم استعادة الإصدار ${version}` };
    }

    // ==================== Approval Workflow Endpoints ====================

    /**
     * 📤 إرسال السياسة للموافقة
     */
    @Post(':id/submit-for-approval')
    @ApiOperation({ summary: 'إرسال السياسة للموافقة' })
    async submitForApproval(
        @Param('id') id: string,
        @Body() body: { notes?: string },
        @CurrentUser() user: any,
    ) {
        const result = await this.approvalService.submitForApproval(
            id,
            user.id,
            `${user.firstName} ${user.lastName}`,
            body.notes,
        );
        return { success: true, ...result };
    }

    /**
     * ✅ الموافقة على السياسة
     */
    @Post(':id/approve')
    @ApiOperation({ summary: 'الموافقة على السياسة' })
    async approve(
        @Param('id') id: string,
        @Body() body: { notes?: string; activateNow?: boolean },
        @CurrentUser() user: any,
    ) {
        const result = await this.approvalService.approve(
            id,
            user.id,
            `${user.firstName} ${user.lastName}`,
            body.notes,
            body.activateNow,
        );
        return { success: true, ...result };
    }

    /**
     * ❌ رفض السياسة
     */
    @Post(':id/reject')
    @ApiOperation({ summary: 'رفض السياسة' })
    async reject(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @CurrentUser() user: any,
    ) {
        const result = await this.approvalService.reject(
            id,
            user.id,
            `${user.firstName} ${user.lastName}`,
            body.reason,
        );
        return { success: true, ...result };
    }

    /**
     * 📋 تاريخ الموافقات لسياسة
     */
    @Get(':id/approvals')
    @ApiOperation({ summary: 'تاريخ الموافقات للسياسة' })
    async getApprovalHistory(@Param('id') id: string) {
        const result = await this.approvalService.getApprovalHistory(id);
        return { success: true, ...result };
    }

    // ==================== Simulation Endpoints ====================

    /**
     * 🧪 محاكاة السياسة على فترة زمنية
     */
    @Post(':id/simulate')
    @ApiOperation({ summary: 'محاكاة تأثير السياسة على الموظفين' })
    async simulate(
        @Param('id') id: string,
        @Body() body: { period: string; employeeIds?: string[] },
        @CurrentUser() user: any,
    ) {
        let result;
        if (body.employeeIds && body.employeeIds.length > 0) {
            result = await this.simulationService.simulateForEmployees(
                id,
                body.employeeIds,
                body.period,
                user.id,
                `${user.firstName} ${user.lastName}`,
            );
        } else {
            result = await this.simulationService.simulate(
                id,
                body.period,
                user.id,
                `${user.firstName} ${user.lastName}`,
            );
        }
        return { success: true, ...result };
    }

    /**
     * 📊 تاريخ المحاكاة لسياسة
     */
    @Get(':id/simulations')
    @ApiOperation({ summary: 'تاريخ المحاكاة للسياسة' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getSimulationHistory(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.simulationService.getSimulationHistory(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        return { success: true, ...result };
    }

    // ==================== Conflict Detection Endpoints ====================

    /**
     * 🔍 اكتشاف التعارضات لسياسة معينة
     */
    @Get(':id/conflicts')
    @ApiOperation({ summary: 'اكتشاف التعارضات مع السياسات الأخرى' })
    async detectConflicts(@Param('id') id: string) {
        const result = await this.conflictService.detectConflicts(id);
        return { success: true, ...result };
    }

    /**
     * ⚡ التحقق من إمكانية التفعيل
     */
    @Get(':id/can-activate')
    @ApiOperation({ summary: 'التحقق من إمكانية تفعيل السياسة بدون تعارضات' })
    async canActivate(@Param('id') id: string) {
        const result = await this.conflictService.validateBeforeActivation(id);
        return { success: true, ...result };
    }

    /**
     * 🗺️ مصفوفة التعارضات للشركة
     */
    @Get('conflict-matrix')
    @ApiOperation({ summary: 'عرض مصفوفة التعارضات لجميع السياسات' })
    async getConflictMatrix(@CurrentUser() user: any) {
        const result = await this.conflictService.getConflictMatrix(user.companyId);
        return { success: true, ...result };
    }

    // ==================== Audit Log Endpoints ====================

    /**
     * 📋 سجل التدقيق لسياسة معينة
     */
    @Get(':id/audit-log')
    @ApiOperation({ summary: 'سجل التدقيق للسياسة' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getAuditLog(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.auditService.getAuditLogForPolicy(id, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        return { success: true, ...result };
    }

    /**
     * 📊 سجل التدقيق الشامل للشركة
     */
    @Get('company-audit-log')
    @ApiOperation({ summary: 'سجل التدقيق الشامل لجميع السياسات' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getCompanyAuditLog(
        @CurrentUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.auditService.getCompanyAuditLog(user.companyId, {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 50,
        });
        return { success: true, ...result };
    }

    /**
     * الحصول على إحصائيات السياسات
     */
    @Get('stats/overview')
    @ApiOperation({ summary: 'إحصائيات السياسات الذكية' })
    async getStats(@CurrentUser() user: any) {
        const [total, active, draft, paused, pending] = await Promise.all([
            this.service.findAll(user.companyId, { limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.ACTIVE, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.DRAFT, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.PAUSED, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.PENDING, limit: 1 }).then(r => r.pagination.total),
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

    // ==================== Exception Management Endpoints ====================

    /**
     * 🚫 إضافة استثناء لسياسة
     */
    @Post(':id/exceptions')
    @ApiOperation({ summary: 'إضافة استثناء (موظف/قسم/فرع) من السياسة' })
    async createException(
        @Param('id') id: string,
        @Body() dto: Omit<CreatePolicyExceptionDto, 'policyId'>,
        @CurrentUser() user: any,
    ) {
        const exception = await this.exceptionService.create(
            user.companyId,
            { ...dto, policyId: id },
            user.id,
            `${user.firstName} ${user.lastName}`,
        );
        return { success: true, data: exception };
    }

    /**
     * 📋 قائمة استثناءات سياسة
     */
    @Get(':id/exceptions')
    @ApiOperation({ summary: 'قائمة الاستثناءات لسياسة معينة' })
    async getExceptions(@Param('id') id: string) {
        const exceptions = await this.exceptionService.findByPolicy(id);
        return { success: true, data: exceptions };
    }

    /**
     * ❌ حذف استثناء
     */
    @Delete('exceptions/:exceptionId')
    @ApiOperation({ summary: 'حذف استثناء' })
    async deleteException(@Param('exceptionId') exceptionId: string) {
        await this.exceptionService.delete(exceptionId);
        return { success: true, message: 'تم حذف الاستثناء' };
    }

    /**
     * 📊 إحصائيات الاستثناءات لسياسة
     */
    @Get(':id/exceptions/stats')
    @ApiOperation({ summary: 'إحصائيات الاستثناءات' })
    async getExceptionStats(@Param('id') id: string) {
        const stats = await this.exceptionService.getExceptionStats(id);
        return { success: true, data: stats };
    }

    // ==================== Retroactive Application Endpoints ====================

    /**
     * ⏪ إنشاء طلب تطبيق بأثر رجعي
     */
    @Post(':id/retro-apply')
    @ApiOperation({ summary: 'إنشاء طلب تطبيق السياسة بأثر رجعي' })
    async createRetroApplication(
        @Param('id') id: string,
        @Body() body: { startPeriod: string; endPeriod: string; notes?: string },
        @CurrentUser() user: any,
    ) {
        const application = await this.retroService.createApplication(
            user.companyId,
            { policyId: id, ...body },
            user.id,
            `${user.firstName} ${user.lastName}`,
        );
        return { success: true, data: application };
    }

    /**
     * 🔢 حساب الأثر الرجعي
     */
    @Post('retro-applications/:appId/calculate')
    @ApiOperation({ summary: 'حساب الأثر الرجعي للطلب' })
    async calculateRetroApplication(@Param('appId') appId: string) {
        const result = await this.retroService.calculate(appId);
        return { success: true, data: result };
    }

    /**
     * ✅ الموافقة على طلب التطبيق الرجعي
     */
    @Post('retro-applications/:appId/approve')
    @ApiOperation({ summary: 'الموافقة على طلب التطبيق الرجعي' })
    async approveRetroApplication(
        @Param('appId') appId: string,
        @CurrentUser() user: any,
    ) {
        const result = await this.retroService.approve(
            appId,
            user.id,
            `${user.firstName} ${user.lastName}`,
        );
        return { success: true, data: result };
    }

    /**
     * 🚀 تنفيذ التطبيق الرجعي
     */
    @Post('retro-applications/:appId/apply')
    @ApiOperation({ summary: 'تنفيذ التطبيق الرجعي وإنشاء سجلات RetroPay' })
    async applyRetroApplication(
        @Param('appId') appId: string,
        @Body() body: { targetPayrollPeriod: string },
    ) {
        const result = await this.retroService.apply(appId, body.targetPayrollPeriod);
        return { success: true, data: result };
    }

    /**
     * 📋 قائمة طلبات التطبيق الرجعي للشركة
     */
    @Get('retro-applications')
    @ApiOperation({ summary: 'قائمة طلبات التطبيق الرجعي' })
    async getRetroApplications(@CurrentUser() user: any) {
        const applications = await this.retroService.findByCompany(user.companyId);
        return { success: true, data: applications };
    }

    /**
     * 📋 قائمة طلبات التطبيق الرجعي لسياسة معينة
     */
    @Get(':id/retro-applications')
    @ApiOperation({ summary: 'قائمة طلبات التطبيق الرجعي لسياسة' })
    async getPolicyRetroApplications(@Param('id') id: string) {
        const applications = await this.retroService.findByPolicy(id);
        return { success: true, data: applications };
    }

    // ==================== Tiered Penalty Endpoints ====================

    /**
     * 📊 إحصائيات التكرار لسياسة
     */
    @Get(':id/occurrences/stats')
    @ApiOperation({ summary: 'إحصائيات تكرار الأحداث للسياسة' })
    async getOccurrenceStats(@Param('id') id: string) {
        const stats = await this.tieredPenaltyService.getOccurrenceStats(id);
        return { success: true, data: stats };
    }

    /**
     * 🔄 إعادة تعيين عدادات التكرار لسياسة
     */
    @Post(':id/occurrences/reset')
    @ApiOperation({ summary: 'إعادة تعيين عدادات التكرار' })
    async resetOccurrences(@Param('id') id: string) {
        const count = await this.tieredPenaltyService.resetAllForPolicy(id);
        return { success: true, message: `تم إعادة تعيين ${count} عداد` };
    }

    /**
     * 📋 تاريخ التكرار لموظف
     */
    @Get('occurrences/employee/:employeeId')
    @ApiOperation({ summary: 'تاريخ التكرار لموظف معين' })
    async getEmployeeOccurrences(@Param('employeeId') employeeId: string) {
        const history = await this.tieredPenaltyService.getEmployeeOccurrenceHistory(employeeId);
        return { success: true, data: history };
    }

    // ==================== Payroll Protection Endpoints ====================

    /**
     * 🔒 التحقق من حالة قفل الرواتب
     */
    @Get('payroll-lock/status')
    @ApiOperation({ summary: 'التحقق من حالة قفل فترة الرواتب' })
    async getPayrollLockStatus(
        @CurrentUser() user: any,
        @Query('year') year?: string,
        @Query('month') month?: string,
    ) {
        const result = await this.payrollProtection.isPayrollPeriodLocked(
            user.companyId,
            year ? parseInt(year, 10) : undefined,
            month ? parseInt(month, 10) : undefined,
        );
        return { success: true, data: result };
    }

    /**
     * 📋 حالة القفل للفترات الأخيرة
     */
    @Get('payroll-lock/recent')
    @ApiOperation({ summary: 'حالة القفل للفترات الأخيرة' })
    async getRecentPeriodsLockStatus(@CurrentUser() user: any) {
        const periods = await this.payrollProtection.getRecentPeriodsLockStatus(user.companyId);
        return { success: true, data: periods };
    }

    /**
     * ⚖️ التحقق من إمكانية التطبيق الرجعي
     */
    @Get('payroll-lock/can-apply-retro')
    @ApiOperation({ summary: 'التحقق من إمكانية التطبيق الرجعي للفترة' })
    async canApplyRetro(
        @CurrentUser() user: any,
        @Query('startPeriod') startPeriod: string,
        @Query('endPeriod') endPeriod: string,
    ) {
        const result = await this.payrollProtection.canApplyRetroactively(
            user.companyId,
            startPeriod,
            endPeriod,
        );
        return { success: true, data: result };
    }

    // ==================== Phase 2: Analytics Endpoints ====================

    /**
     * 📊 إحصائيات وتحليلات السياسات
     */
    @Get('analytics/dashboard')
    @ApiOperation({ summary: 'لوحة التحليلات الشاملة للسياسات' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    async getAnalyticsDashboard(
        @CurrentUser() user: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        } : undefined;

        const analytics = await this.analyticsService.getAnalytics(user.companyId, dateRange);
        return { success: true, data: analytics };
    }

    /**
     * 💪 مؤشر صحة السياسة
     */
    @Get(':id/health')
    @ApiOperation({ summary: 'مؤشر صحة وفعالية السياسة' })
    async getPolicyHealthScore(@Param('id') id: string) {
        const healthScore = await this.analyticsService.getPolicyHealthScore(id);
        return { success: true, data: healthScore };
    }

    // ==================== Phase 2: AI Coach Endpoints ====================

    /**
     * ⚖️ التحقق من التوافق مع نظام العمل
     */
    @Post('coach/validate')
    @ApiOperation({ summary: 'التحقق من توافق السياسة مع نظام العمل السعودي' })
    async validatePolicy(@Body() body: { text: string; parsedRule?: any }) {
        const validation = await this.coachService.validateAgainstLaborLaw(body.text, body.parsedRule);
        return { success: true, data: validation };
    }

    /**
     * 💡 اقتراحات تحسين السياسة
     */
    @Get(':id/coach/suggestions')
    @ApiOperation({ summary: 'اقتراحات المدرب الذكي لتحسين السياسة' })
    async getPolicySuggestions(@Param('id') id: string) {
        const suggestions = await this.coachService.suggestOptimizations(id);
        return { success: true, data: suggestions };
    }

    /**
     * 🔍 تحليل أنماط الشركة
     */
    @Get('coach/patterns')
    @ApiOperation({ summary: 'تحليل أنماط الحضور والغياب للشركة' })
    async analyzePatterns(@CurrentUser() user: any) {
        const patterns = await this.coachService.analyzePatterns(user.companyId);
        return { success: true, data: patterns };
    }

    /**
     * 🎯 سياسات مقترحة للشركة
     */
    @Get('coach/recommendations')
    @ApiOperation({ summary: 'سياسات مقترحة بناءً على بيانات الشركة' })
    async getRecommendations(@CurrentUser() user: any) {
        const recommendations = await this.coachService.recommendPolicies(user.companyId);
        return { success: true, data: recommendations };
    }

    // ==================== Phase 2: Templates Library Endpoints ====================

    /**
     * 🛒 سوق السياسات - جلب جميع القوالب
     */
    @Public()
    @Get('templates/marketplace')
    @ApiOperation({ summary: 'جلب جميع السياسات من السوق' })
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMarketplacePolicies(
        @Query('category') category?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: number,
    ) {
        const templates = await this.templatesService.getMarketplacePolicies({
            category,
            search,
            limit: limit || 100
        });
        return { success: true, data: templates };
    }

    /**
     * 📚 مكتبة القوالب
     */
    @Get('templates/library')
    @ApiOperation({ summary: 'مكتبة قوالب السياسات' })
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    async getTemplates(
        @Query('category') category?: string,
        @Query('search') search?: string,
    ) {
        const templates = await this.templatesService.getTemplates({ category, search });
        return { success: true, data: templates };
    }

    /**
     * 📋 تفاصيل قالب
     */
    @Get('templates/library/:templateId')
    @ApiOperation({ summary: 'تفاصيل قالب سياسة' })
    async getTemplate(@Param('templateId') templateId: string) {
        const template = await this.templatesService.getTemplate(templateId);
        return { success: true, data: template };
    }

    /**
     * 🚀 استخدام قالب
     */
    @Post('templates/library/:templateId/use')
    @ApiOperation({ summary: 'استخدام قالب لإنشاء سياسة جديدة' })
    async useTemplate(
        @Param('templateId') templateId: string,
        @CurrentUser() user: any,
    ) {
        const result = await this.templatesService.useTemplate(templateId, user.companyId, user.id);
        return { success: true, data: result };
    }

    /**
     * ⭐ تقييم قالب
     */
    @Post('templates/library/:templateId/rate')
    @ApiOperation({ summary: 'تقييم قالب سياسة' })
    async rateTemplate(
        @Param('templateId') templateId: string,
        @Body() body: { rating: number },
    ) {
        const result = await this.templatesService.rateTemplate(templateId, body.rating);
        return { success: true, data: result };
    }

    /**
     * 📂 تصنيفات القوالب
     */
    @Get('templates/categories')
    @ApiOperation({ summary: 'تصنيفات قوالب السياسات' })
    async getTemplateCategories() {
        const categories = await this.templatesService.getCategories();
        return { success: true, data: categories };
    }

    /**
     * 🌱 تهيئة القوالب الأساسية
     */
    @Post('templates/seed')
    @ApiOperation({ summary: 'تهيئة القوالب الأساسية (مرة واحدة)' })
    async seedTemplates() {
        const result = await this.templatesService.seedTemplates();
        return { success: true, data: result };
    }

    // ==================== Phase 3: Accountant Tools ====================

    /**
     * 📊 لوحة تحكم المحاسبين
     */
    @Get('accountant/dashboard')
    @ApiOperation({ summary: 'لوحة تحكم المحاسبين - ملخص شامل للسياسات' })
    @ApiQuery({ name: 'month', required: false, type: Number })
    @ApiQuery({ name: 'year', required: false, type: Number })
    async getAccountantDashboard(
        @CurrentUser() user: any,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        const dashboard = await this.accountantDashboard.getDashboardSummary(
            user.companyId,
            month ? parseInt(month, 10) : undefined,
            year ? parseInt(year, 10) : undefined,
        );
        return { success: true, data: dashboard };
    }

    /**
     * ⚡ ملخص سريع للمحاسب (Widget)
     */
    @Get('accountant/quick-summary')
    @ApiOperation({ summary: 'ملخص سريع للمحاسب - للـ Widget' })
    async getQuickSummary(@CurrentUser() user: any) {
        const summary = await this.accountantDashboard.getQuickSummary(user.companyId);
        return { success: true, data: summary };
    }

    /**
     * 👥 تأثير السياسات على الموظفين
     */
    @Get('accountant/employees-impact')
    @ApiOperation({ summary: 'تأثير السياسات على كل موظف' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    @ApiQuery({ name: 'departmentId', required: false, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getEmployeesPolicyImpact(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('departmentId') departmentId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.accountantDashboard.getEmployeesPolicyImpact(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
            {
                departmentId,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 50,
            },
        );
        return { success: true, ...result };
    }

    /**
     * 📅 التقويم المالي للسياسات
     */
    @Get('accountant/financial-calendar')
    @ApiOperation({ summary: 'التقويم المالي للسياسات' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getFinancialCalendar(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const calendar = await this.accountantDashboard.getFinancialCalendar(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );
        return { success: true, data: calendar };
    }

    // ==================== Payroll Integration ====================

    /**
     * 💰 حساب تأثير السياسات على مسير الرواتب
     */
    @Get('payroll/impact')
    @ApiOperation({ summary: 'حساب تأثير السياسات على مسير الرواتب' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async calculatePayrollImpact(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const result = await this.payrollIntegration.calculatePolicyImpactOnPayroll(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );
        return { success: true, ...result };
    }

    /**
     * 🔄 مزامنة السياسات مع مسير الرواتب
     */
    @Post('payroll/sync')
    @ApiOperation({ summary: 'مزامنة السياسات مع مسير الرواتب' })
    async syncPoliciesWithPayroll(
        @CurrentUser() user: any,
        @Body() body: { payrollRunId: string; month: number; year: number },
    ) {
        const result = await this.payrollIntegration.syncPoliciesWithPayroll(
            body.payrollRunId,
            user.companyId,
            body.month,
            body.year,
        );
        return { success: result.success, data: result };
    }

    /**
     * 📋 الحصول على تعديلات السياسات لمسير راتب
     */
    @Get('payroll/:payrollRunId/adjustments')
    @ApiOperation({ summary: 'تعديلات السياسات لمسير راتب معين' })
    async getPayrollAdjustments(@Param('payrollRunId') payrollRunId: string) {
        const result = await this.payrollIntegration.getPolicyAdjustmentsForPayroll(payrollRunId);
        return { success: true, data: result };
    }

    // ==================== Financial Reports ====================

    /**
     * 📊 تقرير مالي شهري
     */
    @Get('reports/monthly')
    @ApiOperation({ summary: 'تقرير مالي شهري للسياسات' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getMonthlyFinancialReport(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const report = await this.financialReports.generateMonthlyReport(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );
        return { success: true, data: report };
    }

    /**
     * 📈 تقرير تحليلي
     */
    @Get('reports/analytical')
    @ApiOperation({ summary: 'تقرير تحليلي للسياسات' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getAnalyticalReport(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const report = await this.financialReports.generateAnalyticalReport(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );
        return { success: true, data: report };
    }

    /**
     * 📊 تقرير مقارنة فترات
     */
    @Get('reports/comparison')
    @ApiOperation({ summary: 'تقرير مقارنة بين فترتين' })
    @ApiQuery({ name: 'month1', required: true, type: Number })
    @ApiQuery({ name: 'year1', required: true, type: Number })
    @ApiQuery({ name: 'month2', required: true, type: Number })
    @ApiQuery({ name: 'year2', required: true, type: Number })
    async getComparisonReport(
        @CurrentUser() user: any,
        @Query('month1') month1: string,
        @Query('year1') year1: string,
        @Query('month2') month2: string,
        @Query('year2') year2: string,
    ) {
        const report = await this.financialReports.generateComparisonReport(
            user.companyId,
            { month: parseInt(month1, 10), year: parseInt(year1, 10) },
            { month: parseInt(month2, 10), year: parseInt(year2, 10) },
        );
        return { success: true, data: report };
    }

    // ==================== Export ====================

    /**
     * 📥 تصدير تقرير Excel
     */
    @Get('export/excel')
    @ApiOperation({ summary: 'تصدير تقرير السياسات لـ Excel' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async exportExcel(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response,
    ) {
        const buffer = await this.exportService.exportMonthlyReport(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );

        const filename = `policy-report-${year}-${month}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    /**
     * 📥 تصدير قائمة الموظفين المتأثرين
     */
    @Get('export/affected-employees')
    @ApiOperation({ summary: 'تصدير قائمة الموظفين المتأثرين لـ Excel' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async exportAffectedEmployees(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response,
    ) {
        const buffer = await this.exportService.exportAffectedEmployees(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );

        const filename = `affected-employees-${year}-${month}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    /**
     * 📥 تصدير CSV بسيط
     */
    @Get('export/csv')
    @ApiOperation({ summary: 'تصدير ملخص CSV بسيط' })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async exportCSV(
        @CurrentUser() user: any,
        @Query('month') month: string,
        @Query('year') year: string,
        @Res() res: Response,
    ) {
        const csv = await this.exportService.exportSimpleCSV(
            user.companyId,
            parseInt(month, 10),
            parseInt(year, 10),
        );

        const filename = `policy-data-${year}-${month}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // إضافة BOM للدعم العربي
        res.send('\ufeff' + csv);
    }

    /**
     * 📥 تصدير سجل التدقيق
     */
    @Get('export/audit-log')
    @ApiOperation({ summary: 'تصدير سجل التدقيق لـ Excel' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async exportAuditLog(
        @CurrentUser() user: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Res() res: Response,
    ) {
        const buffer = await this.exportService.exportAuditLog(
            user.companyId,
            new Date(startDate),
            new Date(endDate),
        );

        const filename = `audit-log-${startDate}-to-${endDate}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }

    // ==================== 🚀 ADVANCED FEATURES ENDPOINTS ====================

    // ==================== AI Policy Builder ====================

    /**
     * 🤖 بناء سياسة من وصف طبيعي بالذكاء الاصطناعي
     */
    @Post('ai-builder/build')
    @ApiOperation({ summary: 'بناء سياسة ذكية من وصف نصي باستخدام AI' })
    async buildPolicyFromDescription(
        @Body() body: { description: string; context?: any },
        @CurrentUser() user: any,
    ) {
        const result = await this.aiPolicyBuilder.buildFromDescription(
            body.description,
            { companyId: user.companyId, ...body.context },
        );
        return { success: true, data: result };
    }

    /**
     * 💡 اقتراحات سياسات للشركة
     */
    @Get('ai-builder/suggestions')
    @ApiOperation({ summary: 'اقتراحات سياسات ذكية بناءً على بيانات الشركة' })
    @ApiQuery({ name: 'industry', required: false, type: String })
    @ApiQuery({ name: 'companySize', required: false, type: String })
    async getAIPolicySuggestions(
        @CurrentUser() user: any,
        @Query('industry') industry?: string,
        @Query('companySize') companySize?: string,
    ) {
        const context = {
            companyId: user.companyId,
            userId: user.id,
            existingPolicies: [],
            companyProfile: {
                industry: industry || 'GENERAL',
                size: (companySize as any) || 'MEDIUM',
                country: 'SA',
                workingDays: [0, 1, 2, 3, 4], // الأحد - الخميس
                averageSalary: 8000,
                employeeCount: 50,
            },
        };
        const suggestions = await this.aiPolicyBuilder.getSuggestions(context);
        return { success: true, data: suggestions };
    }

    // ==================== Real-time Dashboard ====================

    /**
     * 📊 لوحة التحكم الحية
     */
    @Get('dashboard/realtime')
    @ApiOperation({ summary: 'بيانات لوحة التحكم الحية للسياسات' })
    async getRealtimeDashboard(@CurrentUser() user: any) {
        const dashboard = await this.realtimeDashboard.getDashboardData(user.companyId);
        return { success: true, data: dashboard };
    }

    /**
     * 📈 نظرة عامة سريعة
     */
    @Get('dashboard/overview')
    @ApiOperation({ summary: 'نظرة عامة سريعة على السياسات' })
    async getDashboardOverview(@CurrentUser() user: any) {
        const overview = await this.realtimeDashboard.getOverview(user.companyId);
        return { success: true, data: overview };
    }

    /**
     * 📉 الرسوم البيانية
     */
    @Get('dashboard/charts')
    @ApiOperation({ summary: 'بيانات الرسوم البيانية للوحة التحكم' })
    async getDashboardCharts(@CurrentUser() user: any) {
        const charts = await this.realtimeDashboard.getCharts(user.companyId);
        return { success: true, data: charts };
    }

    /**
     * 🔔 التنبيهات الحية
     */
    @Get('dashboard/alerts')
    @ApiOperation({ summary: 'تنبيهات لوحة التحكم' })
    async getDashboardAlerts(@CurrentUser() user: any) {
        const alerts = await this.realtimeDashboard.getAlerts(user.companyId);
        return { success: true, data: alerts };
    }

    /**
     * 📊 مؤشرات الأداء الرئيسية
     */
    @Get('dashboard/kpis')
    @ApiOperation({ summary: 'مؤشرات الأداء الرئيسية KPIs' })
    async getDashboardKPIs(@CurrentUser() user: any) {
        const kpis = await this.realtimeDashboard.getKPIs(user.companyId);
        return { success: true, data: kpis };
    }

    // ==================== Advanced Analytics ====================

    /**
     * 📊 تقرير التحليلات المتقدمة
     */
    @Post('analytics/advanced/report')
    @ApiOperation({ summary: 'إنشاء تقرير تحليلات متقدم' })
    async generateAdvancedAnalyticsReport(
        @CurrentUser() user: any,
        @Body() body: { startDate: string; endDate: string; options?: any },
    ) {
        const report = await this.advancedAnalyticsFeature.generateReport(
            user.companyId,
            new Date(body.startDate),
            new Date(body.endDate),
        );
        return { success: true, data: report };
    }

    /**
     * 🔍 اكتشاف الأنماط الشاذة
     */
    @Get('analytics/anomalies')
    @ApiOperation({ summary: 'اكتشاف الأنماط الشاذة في السياسات' })
    async detectAnomalies(@CurrentUser() user: any) {
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const period = {
            startDate: thirtyDaysAgo,
            endDate: now,
            comparisonStartDate: sixtyDaysAgo,
            comparisonEndDate: thirtyDaysAgo,
            label: 'آخر 30 يوم',
        };
        const anomalies = await this.advancedAnalyticsFeature.detectAnomalies(user.companyId, period);
        return { success: true, data: anomalies };
    }

    /**
     * 📈 تحليل الاتجاهات
     */
    @Get('analytics/trends')
    @ApiOperation({ summary: 'تحليل اتجاهات السياسات' })
    async analyzeTrends(@CurrentUser() user: any) {
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const period = {
            startDate: thirtyDaysAgo,
            endDate: now,
            comparisonStartDate: sixtyDaysAgo,
            comparisonEndDate: thirtyDaysAgo,
            label: 'آخر 30 يوم',
        };
        const trends = await this.advancedAnalyticsFeature.analyzeTrends(user.companyId, period);
        return { success: true, data: trends };
    }

    // ==================== Smart Notifications ====================

    /**
     * 🔔 إرسال إشعار
     */
    @Post('notifications/send')
    @ApiOperation({ summary: 'إرسال إشعار ذكي' })
    async sendNotification(
        @CurrentUser() user: any,
        @Body() body: {
            type: string;
            title: string;
            message: string;
            recipients: string[];
            channels?: string[];
            priority?: string;
        },
    ) {
        // إرسال إشعار لكل مستلم
        const results = await Promise.all(
            body.recipients.map(recipientId =>
                this.smartNotifications.send({
                    type: body.type as any,
                    priority: (body.priority as any) || 'MEDIUM',
                    channel: (body.channels as any) || ['IN_APP'],
                    recipient: { userId: recipientId },
                    content: { title: body.title, body: body.message },
                    metadata: { companyId: user.companyId, source: 'API' },
                })
            )
        );
        return { success: true, data: results };
    }

    /**
     * 📋 قائمة الإشعارات
     */
    @Get('notifications')
    @ApiOperation({ summary: 'قائمة الإشعارات' })
    async getNotifications(
        @CurrentUser() user: any,
        @Query('unreadOnly') unreadOnly?: string,
    ) {
        const notifications = await this.smartNotifications.getNotifications(
            user.id,
            { unreadOnly: unreadOnly === 'true' },
        );
        return { success: true, data: notifications };
    }

    /**
     * ✅ تعليم الإشعار كمقروء
     */
    @Post('notifications/:notificationId/read')
    @ApiOperation({ summary: 'تعليم إشعار كمقروء' })
    async markNotificationAsRead(
        @Param('notificationId') notificationId: string,
        @CurrentUser() user: any,
    ) {
        await this.smartNotifications.markAsRead(notificationId, user.id);
        return { success: true, message: 'تم تعليم الإشعار كمقروء' };
    }

    /**
     * 📊 إحصائيات الإشعارات
     */
    @Get('notifications/stats')
    @ApiOperation({ summary: 'إحصائيات الإشعارات' })
    async getNotificationStats(@CurrentUser() user: any) {
        const stats = await this.smartNotifications.getStats(user.companyId);
        return { success: true, data: stats };
    }

    // ==================== Policy Wizard ====================

    /**
     * 🧙 بدء جلسة معالج جديدة
     */
    @Post('wizard/start')
    @ApiOperation({ summary: 'بدء جلسة معالج إنشاء سياسة جديدة' })
    async startWizardSession(@CurrentUser() user: any) {
        const session = await this.policyWizard.startSession(user.companyId, user.id);
        return { success: true, data: session };
    }

    /**
     * 📋 جلب جلسة المعالج
     */
    @Get('wizard/:sessionId')
    @ApiOperation({ summary: 'جلب بيانات جلسة المعالج' })
    async getWizardSession(@Param('sessionId') sessionId: string) {
        const session = await this.policyWizard.getSession(sessionId);
        return { success: true, data: session };
    }

    /**
     * ➡️ الخطوة التالية في المعالج
     */
    @Post('wizard/:sessionId/next')
    @ApiOperation({ summary: 'الانتقال للخطوة التالية في المعالج' })
    async wizardNextStep(
        @Param('sessionId') sessionId: string,
        @Body() body: { data: any },
    ) {
        const session = await this.policyWizard.nextStep(sessionId, body.data);
        return { success: true, data: session };
    }

    /**
     * ⬅️ الخطوة السابقة في المعالج
     */
    @Post('wizard/:sessionId/previous')
    @ApiOperation({ summary: 'العودة للخطوة السابقة في المعالج' })
    async wizardPreviousStep(@Param('sessionId') sessionId: string) {
        const session = await this.policyWizard.previousStep(sessionId);
        return { success: true, data: session };
    }

    /**
     * 💾 حفظ المسودة
     */
    @Post('wizard/:sessionId/save-draft')
    @ApiOperation({ summary: 'حفظ مسودة المعالج' })
    async saveWizardDraft(@Param('sessionId') sessionId: string) {
        const session = await this.policyWizard.saveDraft(sessionId);
        return { success: true, data: session };
    }

    /**
     * 👁️ معاينة السياسة
     */
    @Get('wizard/:sessionId/preview')
    @ApiOperation({ summary: 'معاينة السياسة قبل الإنشاء' })
    async previewWizardPolicy(@Param('sessionId') sessionId: string) {
        const preview = await this.policyWizard.getPreview(sessionId);
        return { success: true, data: preview };
    }

    /**
     * ✅ إكمال المعالج وإنشاء السياسة
     */
    @Post('wizard/:sessionId/complete')
    @ApiOperation({ summary: 'إكمال المعالج وإنشاء السياسة' })
    async completeWizard(@Param('sessionId') sessionId: string) {
        const result = await this.policyWizard.complete(sessionId);
        return { success: true, data: result };
    }

    // ==================== Integration Hub ====================

    /**
     * 📋 قائمة التكاملات
     */
    @Get('integrations')
    @ApiOperation({ summary: 'قائمة التكاملات الخارجية' })
    async getIntegrations(@CurrentUser() user: any) {
        const integrations = await this.integrationHub.getIntegrations(user.companyId);
        return { success: true, data: integrations };
    }

    /**
     * ➕ إضافة تكامل جديد
     */
    @Post('integrations')
    @ApiOperation({ summary: 'إضافة تكامل خارجي جديد' })
    async createIntegration(
        @CurrentUser() user: any,
        @Body() body: { type: string; provider: string; config: any; name?: string },
    ) {
        const integration = await this.integrationHub.createIntegration(
            user.companyId,
            {
                type: body.type as any,
                provider: body.provider as any,
                name: body.name || body.provider,
                config: body.config,
            },
        );
        return { success: true, data: integration };
    }

    /**
     * 🔄 مزامنة بيانات التكامل
     */
    @Post('integrations/:integrationId/sync')
    @ApiOperation({ summary: 'مزامنة بيانات التكامل' })
    async syncIntegration(
        @Param('integrationId') integrationId: string,
    ) {
        const result = await this.integrationHub.syncData(integrationId);
        return { success: true, data: result };
    }

    /**
     * 📋 قوالب مزودي الخدمات
     */
    @Get('integrations/providers/templates')
    @ApiOperation({ summary: 'قوالب مزودي خدمات التكامل' })
    async getProviderTemplates() {
        const templates = await this.integrationHub.getProviderTemplates();
        return { success: true, data: templates };
    }

    // ==================== Advanced Reporting ====================

    /**
     * 📊 إنشاء تقرير متقدم
     */
    @Post('advanced-reports/generate')
    @ApiOperation({ summary: 'إنشاء تقرير متقدم' })
    async generateAdvancedReport(
        @CurrentUser() user: any,
        @Body() body: { type: string; filters?: any; format?: string },
    ) {
        const report = await this.advancedReporting.generateReport(
            user.companyId,
            body.type as any,
            body.filters,
            body.format as any,
        );
        return { success: true, data: report };
    }

    /**
     * 📅 جدولة تقرير
     */
    @Post('advanced-reports/schedule')
    @ApiOperation({ summary: 'جدولة تقرير دوري' })
    async scheduleReport(
        @CurrentUser() user: any,
        @Body() body: {
            name: string;
            type: string;
            schedule: { frequency: string; dayOfWeek?: number; dayOfMonth?: number; time: string };
            recipients: string[];
            format?: string;
        },
    ) {
        const report = {
            id: `report-${Date.now()}`,
            companyId: user.companyId,
            name: body.name,
            type: body.type as any,
            template: { sections: [], layout: 'PORTRAIT' as const, theme: 'DEFAULT' as const },
            filters: {},
            schedule: { ...body.schedule, timezone: 'Asia/Riyadh', enabled: true } as any,
            format: (body.format as any) || 'PDF',
            recipients: body.recipients,
            createdBy: user.id,
            createdAt: new Date(),
            lastRun: null,
            nextRun: null,
        };
        await this.advancedReporting.scheduleReport(report);
        return { success: true, data: report };
    }

    // ==================== Policy Marketplace ====================

    /**
     * 🛒 البحث في سوق السياسات
     */
    @Get('marketplace/search')
    @ApiOperation({ summary: 'البحث في سوق السياسات' })
    async searchMarketplace(
        @Query('query') query?: string,
        @Query('category') category?: string,
        @Query('industry') industry?: string,
    ) {
        const results = await this.marketplace.search({
            search: query,
            category: category ? [category] as any : undefined,
            industry: industry ? [industry] : undefined,
        });
        return { success: true, data: results };
    }

    /**
     * 📋 تفاصيل سياسة من السوق
     */
    @Get('marketplace/:policyId')
    @ApiOperation({ summary: 'تفاصيل سياسة من السوق' })
    async getMarketplacePolicy(@Param('policyId') policyId: string) {
        const policy = await this.marketplace.getPolicy(policyId);
        return { success: true, data: policy };
    }

    /**
     * 🔥 السياسات الأكثر شعبية
     */
    @Get('marketplace/featured/popular')
    @ApiOperation({ summary: 'السياسات الأكثر شعبية في السوق' })
    async getPopularPolicies(@Query('limit') limit?: string) {
        const policies = await this.marketplace.getPopular(limit ? parseInt(limit) : 10);
        return { success: true, data: policies };
    }

    /**
     * ⭐ السياسات الأعلى تقييماً
     */
    @Get('marketplace/featured/top-rated')
    @ApiOperation({ summary: 'السياسات الأعلى تقييماً في السوق' })
    async getTopRatedPolicies(@Query('limit') limit?: string) {
        const policies = await this.marketplace.getTopRated(limit ? parseInt(limit) : 10);
        return { success: true, data: policies };
    }

    /**
     * 📥 تثبيت سياسة من السوق
     */
    @Post('marketplace/:policyId/install')
    @ApiOperation({ summary: 'تثبيت سياسة من السوق' })
    async installMarketplacePolicy(
        @CurrentUser() user: any,
        @Param('policyId') policyId: string,
        @Body() body: { customizations?: Record<string, any> },
    ) {
        const result = await this.marketplace.installPolicy(
            policyId,
            user.companyId,
            user.id,
            body.customizations,
        );
        return { success: true, data: result };
    }

    /**
     * ⭐ إضافة تقييم لسياسة
     */
    @Post('marketplace/:policyId/review')
    @ApiOperation({ summary: 'إضافة تقييم لسياسة في السوق' })
    async addMarketplaceReview(
        @CurrentUser() user: any,
        @Param('policyId') policyId: string,
        @Body() body: { rating: number; comment?: string },
    ) {
        const result = await this.marketplace.addReview(policyId, user.id, {
            userName: `${user.firstName} ${user.lastName}`,
            rating: body.rating,
            title: body.comment || 'تقييم',
            content: body.comment || '',
            isVerifiedPurchase: true,
        });
        return { success: true, data: result };
    }

    /**
     * 📂 فئات السوق
     */
    @Get('marketplace/meta/categories')
    @ApiOperation({ summary: 'فئات سوق السياسات' })
    async getMarketplaceCategories() {
        const categories = await this.marketplace.getCategories();
        return { success: true, data: categories };
    }

    /**
     * 💎 المجموعات المميزة
     */
    @Get('marketplace/collections/featured')
    @ApiOperation({ summary: 'المجموعات المميزة من السياسات' })
    async getFeaturedCollections() {
        const collections = await this.marketplace.getFeaturedCollections();
        return { success: true, data: collections };
    }

    /**
     * 🎯 سياسات موصى بها للشركة
     */
    @Get('marketplace/recommendations')
    @ApiOperation({ summary: 'سياسات موصى بها بناءً على بيانات الشركة' })
    async getMarketplaceRecommendations(@CurrentUser() user: any) {
        const recommendations = await this.marketplace.getRecommendations(user.companyId);
        return { success: true, data: recommendations };
    }

    // ==================== Additional Payroll Integration (New) ====================

    /**
     * 📝 تطبيق السياسات على موظف واحد في مسير الرواتب
     */
    @Post('payroll/apply-to-employee')
    @ApiOperation({ summary: 'تطبيق السياسات على موظف في مسير الرواتب' })
    async applyPoliciesToEmployee(
        @CurrentUser() user: any,
        @Body() body: { payrollRunId: string; employeeId: string; month: number; year: number },
    ) {
        const result = await this.payrollIntegration.applyPoliciesToPayrollRecord(
            body.payrollRunId,
            body.employeeId,
            user.companyId,
            body.month,
            body.year,
        );
        return { success: true, data: result };
    }
}
