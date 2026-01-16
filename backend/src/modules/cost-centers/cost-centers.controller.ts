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
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CostCentersService } from './cost-centers.service';
import {
    CreateCostCenterDto,
    UpdateCostCenterDto,
    CreateAllocationDto,
    CreateBudgetDto,
} from './dto/cost-center.dto';

interface AuthenticatedRequest {
    user: {
        id: string;
        companyId: string;
        role: string;
    };
}

@ApiTags('Cost Centers - مراكز التكلفة')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cost-centers')
export class CostCentersController {
    constructor(private readonly costCentersService: CostCentersService) { }

    // ==================== CRUD مراكز التكلفة ====================

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء مركز تكلفة جديد' })
    async create(@Body() dto: CreateCostCenterDto, @Req() req: AuthenticatedRequest) {
        const result = await this.costCentersService.create(dto, req.user.companyId);
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: result.id,
            userId: req.user.id,
            action: 'CREATE',
            entityType: 'COST_CENTER',
            newValue: result,
            description: `إنشاء مركز تكلفة جديد: ${result.nameAr}`,
        });
        return result;
    }

    @Get()
    @ApiOperation({ summary: 'قائمة مراكز التكلفة' })
    @ApiQuery({ name: 'status', required: false, description: 'فلتر الحالة' })
    @ApiQuery({ name: 'type', required: false, description: 'فلتر النوع' })
    @ApiQuery({ name: 'search', required: false, description: 'بحث' })
    findAll(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('search') search?: string,
    ) {
        return this.costCentersService.findAll(req.user.companyId, { status, type, search });
    }

    @Get('tree')
    @ApiOperation({ summary: 'الهيكل الهرمي لمراكز التكلفة' })
    findTree(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.findTree(req.user.companyId);
    }

    // ==================== الميزات الجديدة - الدفعة الأولى ====================

    @Get('dashboard')
    @ApiOperation({ summary: 'لوحة KPIs لمراكز التكلفة' })
    getDashboardKPIs(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getDashboardKPIs(req.user.companyId);
    }

    @Get('budget-alerts')
    @ApiOperation({ summary: 'تنبيهات تجاوز الميزانية' })
    getBudgetAlerts(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getBudgetAlerts(req.user.companyId);
    }

    @Get('cost-per-head')
    @ApiOperation({ summary: 'تكلفة الموظف الواحد لكل مركز' })
    getCostPerHead(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getCostPerHead(req.user.companyId);
    }

    @Get('incomplete-allocations')
    @ApiOperation({ summary: 'التوزيعات غير المكتملة' })
    getIncompleteAllocations(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getIncompleteAllocations(req.user.companyId);
    }

    @Get('headcount-distribution')
    @ApiOperation({ summary: 'توزيع الموظفين على المراكز' })
    getHeadcountDistribution(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getHeadcountDistribution(req.user.companyId);
    }

    @Get('budget-templates')
    @ApiOperation({ summary: 'قوالب الميزانية' })
    getBudgetTemplates(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getBudgetTemplates(req.user.companyId);
    }

    @Get('expense-summary')
    @ApiOperation({ summary: 'ملخص المصروفات الإجمالي' })
    getGlobalExpenseSummary(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getCompanyExpenseSummary(req.user.companyId);
    }

    @Get('dashboard-data')
    @ApiOperation({ summary: 'بيانات اللوحة التفاعلية' })
    getDashboardData(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getInteractiveDashboardData(req.user.companyId);
    }

    // Batch 5 static routes
    @Get('alerts-dashboard')
    @ApiOperation({ summary: 'لوحة التنبيهات المركزية' })
    getAlertsDashboard(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getAlertsDashboard(req.user.companyId);
    }

    @Post('compare')
    @ApiOperation({ summary: 'مقارنة مراكز التكلفة' })
    compareCostCenters(
        @Body() dto: { costCenterIds: string[] },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.compareCostCenters(dto.costCenterIds, req.user.companyId);
    }

    @Post('transfer')
    @ApiOperation({ summary: 'تحويل بين المراكز' })
    transferBetweenCenters(
        @Body() dto: { fromId: string; toId: string; amount: number; month: number; year: number; reason: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.transferBetweenCenters(
            dto.fromId, dto.toId, req.user.companyId, dto.amount, dto.month, dto.year, dto.reason, req.user.id
        );
    }

    // Batch 6 static routes
    @Get('allocation-rules')
    @ApiOperation({ summary: 'قواعد التوزيع' })
    getAllocationRules(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getAllocationRules(req.user.companyId);
    }

    @Get('enhanced-dashboard')
    @ApiOperation({ summary: 'لوحة المعلومات المحسنة' })
    getEnhancedDashboard(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getEnhancedDashboard(req.user.companyId);
    }

    @Post('export')
    @ApiOperation({ summary: 'تصدير التقارير' })
    exportReport(
        @Body() dto: { format: 'json' | 'csv'; reportType?: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.exportReport(req.user.companyId, dto.format, dto.reportType || 'summary');
    }

    @Post('multi-compare')
    @ApiOperation({ summary: 'مقارنة متعددة المراكز' })
    multiCenterComparison(
        @Body() dto: { costCenterIds: string[]; metrics?: string[] },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getMultiCenterComparison(req.user.companyId, dto.costCenterIds, dto.metrics || []);
    }

    @Post('custom-alerts')
    @ApiOperation({ summary: 'تنبيهات مخصصة' })
    getCustomAlerts(
        @Body() dto: { overBudget?: number; underUtilized?: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getCustomAlerts(req.user.companyId, dto);
    }

    // Batch 8 static routes
    @Get('dashboard-summary')
    @ApiOperation({ summary: 'ملخص لوحة التحكم' })
    getDashboardSummary(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getDashboardSummary(req.user.companyId);
    }

    @Get('smart-alerts')
    @ApiOperation({ summary: 'التنبيهات الذكية' })
    getSmartAlerts(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getSmartAlerts(req.user.companyId);
    }

    // Batch 9 static routes
    @Post('custom-report')
    @ApiOperation({ summary: 'إنشاء تقرير مخصص' })
    generateCustomReport(
        @Body() dto: { metrics: string[]; groupBy: 'center' | 'department' | 'month'; year?: number; format?: 'summary' | 'detailed' },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.generateCustomReport(req.user.companyId, dto);
    }

    @Get('department-rollup')
    @ApiOperation({ summary: 'تجميع ميزانية الأقسام' })
    @ApiQuery({ name: 'departmentId', required: false, description: 'معرف القسم' })
    getDepartmentRollup(
        @Query('departmentId') departmentId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getDepartmentBudgetRollup(req.user.companyId, departmentId || undefined);
    }

    // Batch 10 static routes
    @Get('benchmark')
    @ApiOperation({ summary: 'المقارنة المعيارية لمراكز التكلفة' })
    getBenchmarkData(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getBenchmarkData(req.user.companyId);
    }

    @Post('compare')
    @ApiOperation({ summary: 'مقارنة مراكز تكلفة محددة' })
    compareCenters(
        @Body() dto: { centerIds: string[] },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.compareCenters(dto.centerIds, req.user.companyId);
    }

    // ==================== Batch 11 Static Routes ====================

    @Get('forecast-trends')
    @ApiOperation({ summary: 'اتجاهات التنبؤ لجميع المراكز' })
    getForecastTrends(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getForecastTrends(req.user.companyId);
    }

    @Get('health-rankings')
    @ApiOperation({ summary: 'ترتيب المراكز حسب الصحة' })
    getHealthRankings(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getHealthRankings(req.user.companyId);
    }

    @Get('reallocation-suggestions')
    @ApiOperation({ summary: 'اقتراحات إعادة التوزيع' })
    getReallocationSuggestions(@Req() req: AuthenticatedRequest) {
        return this.costCentersService.getReallocationSuggestions(req.user.companyId);
    }

    @Post('apply-reallocation')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تطبيق إعادة التوزيع' })
    applyReallocation(
        @Body() dto: { suggestionId: string; fromCenterId: string; toCenterId: string; amount: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.applyReallocation(
            req.user.companyId,
            dto.suggestionId,
            dto.fromCenterId,
            dto.toCenterId,
            dto.amount,
            req.user.id,
        );
    }

    // Batch 7 static routes
    @Get('budget-calendar')
    @ApiOperation({ summary: 'تقويم الميزانية' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    getBudgetCalendar(
        @Query('year') year: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getBudgetCalendar(req.user.companyId, year ? parseInt(year) : undefined);
    }

    // Batch 6 - Dynamic routes (MUST be before :id)
    @Get(':id/cost-drivers')
    @ApiOperation({ summary: 'محركات التكلفة' })
    getCostDrivers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getCostDrivers(id, req.user.companyId);
    }

    @Get(':id/budget-versions')
    @ApiOperation({ summary: 'إصدارات الميزانية' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    getBudgetVersions(
        @Param('id') id: string,
        @Query('year') year: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getBudgetVersions(id, req.user.companyId, year ? parseInt(year) : new Date().getFullYear());
    }

    @Get(':id/change-history')
    @ApiOperation({ summary: 'سجل التغييرات' })
    @ApiQuery({ name: 'limit', required: false, description: 'عدد السجلات' })
    getChangeHistory(
        @Param('id') id: string,
        @Query('limit') limit: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getChangeHistory(id, req.user.companyId, limit ? parseInt(limit) : 20);
    }

    @Post(':id/allocation-rule')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة قاعدة توزيع' })
    createAllocationRule(
        @Param('id') id: string,
        @Body() dto: { userId: string; percentage: number; effectiveFrom?: Date },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.createAllocationRule(id, req.user.companyId, dto);
    }

    // Batch 8 - Multi-Year Planning
    @Get(':id/multi-year-plan')
    @ApiOperation({ summary: 'تخطيط متعدد السنوات' })
    @ApiQuery({ name: 'years', required: false, description: 'السنوات (مفصولة بفواصل)' })
    getMultiYearPlan(
        @Param('id') id: string,
        @Query('years') years: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const yearsArray = years ? years.split(',').map(y => parseInt(y.trim())) : undefined;
        return this.costCentersService.getMultiYearPlan(id, req.user.companyId, yearsArray);
    }

    @Post(':id/multi-year-budget')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء ميزانية متعددة السنوات' })
    createMultiYearBudget(
        @Param('id') id: string,
        @Body() dto: { years: number[]; monthlyAmount: number; growthRate?: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.createMultiYearBudget(id, req.user.companyId, req.user.id, dto);
    }

    // Batch 9 - Scenario Simulator
    @Post(':id/simulate-scenario')
    @ApiOperation({ summary: 'محاكاة سيناريو الميزانية' })
    simulateBudgetScenario(
        @Param('id') id: string,
        @Body() dto: { type: 'OPTIMISTIC' | 'PESSIMISTIC' | 'REALISTIC'; salaryChange?: number; headcountChange?: number; inflationRate?: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.simulateBudgetScenario(id, req.user.companyId, dto);
    }

    // Batch 10 - Budget Approval Workflow
    @Post(':id/submit-for-approval')
    @ApiOperation({ summary: 'تقديم الميزانية للموافقة' })
    submitForApproval(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.submitBudgetForApproval(id, req.user.companyId, req.user.id);
    }

    @Post(':id/approve-budget')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'الموافقة على الميزانية' })
    approveBudget(
        @Param('id') id: string,
        @Body() dto: { comment?: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.approveBudget(id, req.user.companyId, req.user.id, dto?.comment);
    }

    @Post(':id/reject-budget')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'رفض الميزانية' })
    rejectBudget(
        @Param('id') id: string,
        @Body() dto: { reason: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.rejectBudget(id, req.user.companyId, req.user.id, dto.reason);
    }

    @Get(':id/approval-history')
    @ApiOperation({ summary: 'سجل الموافقات' })
    getApprovalHistory(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getBudgetApprovalHistory(id, req.user.companyId);
    }

    // Batch 10 - Expense Tracking
    @Post(':id/expenses')
    @ApiOperation({ summary: 'تسجيل مصروف' })
    recordExpense(
        @Param('id') id: string,
        @Body() dto: { amount: number; category: string; description?: string; date: Date; receiptUrl?: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.recordExpense(id, req.user.companyId, req.user.id, dto);
    }

    @Get(':id/expenses')
    @ApiOperation({ summary: 'قائمة المصروفات' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'category', required: false })
    getExpenses(
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('category') category: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getExpensesByCenter(id, req.user.companyId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            category: category || undefined,
        });
    }

    @Get(':id/expense-summary')
    @ApiOperation({ summary: 'ملخص المصروفات' })
    getExpenseSummary(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getExpenseSummary(id, req.user.companyId);
    }

    // ==================== Batch 11 Dynamic Routes ====================

    @Get(':id/forecast-ai')
    @ApiOperation({ summary: 'التنبؤ الذكي بالميزانية' })
    getAIForecast(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getAIForecast(id, req.user.companyId);
    }

    @Get(':id/health-score')
    @ApiOperation({ summary: 'مؤشر صحة مركز التكلفة' })
    getHealthScore(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getHealthScore(id, req.user.companyId);
    }

    // ==================== مسارات مع ID ديناميكي ====================

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل مركز تكلفة' })
    findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.findOne(id, req.user.companyId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث مركز تكلفة' })
    async update(@Param('id') id: string, @Body() dto: UpdateCostCenterDto, @Req() req: AuthenticatedRequest) {
        const oldData = await this.costCentersService.findOne(id, req.user.companyId);
        const result = await this.costCentersService.update(id, dto, req.user.companyId);
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: id,
            userId: req.user.id,
            action: 'UPDATE',
            entityType: 'COST_CENTER',
            oldValue: oldData,
            newValue: result,
            description: `تحديث مركز تكلفة: ${result.nameAr}`,
        });
        return result;
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'أرشفة مركز تكلفة' })
    async archive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        const oldData = await this.costCentersService.findOne(id, req.user.companyId);
        const result = await this.costCentersService.archive(id, req.user.companyId);
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: id,
            userId: req.user.id,
            action: 'ARCHIVE',
            entityType: 'COST_CENTER',
            oldValue: oldData,
            newValue: result,
            description: `أرشفة مركز تكلفة: ${oldData.nameAr}`,
        });
        return result;
    }

    // ==================== التوزيعات ====================

    @Post(':id/allocations')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة توزيع موظف على مركز تكلفة' })
    async createAllocation(
        @Param('id') costCenterId: string,
        @Body() dto: CreateAllocationDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const result = await this.costCentersService.createAllocation(
            { ...dto, costCenterId },
            req.user.companyId,
        );
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: costCenterId,
            userId: req.user.id,
            action: 'ALLOCATE',
            entityType: 'ALLOCATION',
            entityId: result.id,
            newValue: result,
            description: `إضافة توزيع ${dto.percentage}% لموظف`,
        });
        return result;
    }

    @Get(':id/allocations')
    @ApiOperation({ summary: 'توزيعات مركز التكلفة' })
    findAllocations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.findAllocations(id, req.user.companyId);
    }

    @Get('user/:userId/allocations')
    @ApiOperation({ summary: 'توزيعات موظف معين' })
    findUserAllocations(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.findUserAllocations(userId, req.user.companyId);
    }

    @Delete('allocations/:allocationId')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إلغاء توزيع' })
    async deactivateAllocation(@Param('allocationId') allocationId: string, @Req() req: AuthenticatedRequest) {
        const result = await this.costCentersService.deactivateAllocation(allocationId, req.user.companyId);
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: result.costCenterId,
            userId: req.user.id,
            action: 'DEALLOCATE',
            entityType: 'ALLOCATION',
            entityId: allocationId,
            oldValue: result,
            description: `إلغاء توزيع موظف`,
        });
        return result;
    }

    // ==================== الميزانيات ====================

    @Post(':id/budgets')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة ميزانية لمركز تكلفة' })
    async createBudget(@Param('id') costCenterId: string, @Body() dto: CreateBudgetDto, @Req() req: AuthenticatedRequest) {
        const result = await this.costCentersService.createBudget({ ...dto, costCenterId }, req.user.companyId);
        // تسجيل في سجل التدقيق
        await this.costCentersService.logAudit({
            costCenterId: costCenterId,
            userId: req.user.id,
            action: 'BUDGET_CREATE',
            entityType: 'BUDGET',
            entityId: result.id,
            newValue: result,
            description: `إضافة ميزانية ${dto.budgetAmount} ريال لسنة ${dto.year}`,
        });
        return result;
    }

    @Get(':id/budgets')
    @ApiOperation({ summary: 'ميزانيات مركز التكلفة' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    findBudgets(@Param('id') id: string, @Query('year') year?: string) {
        return this.costCentersService.findBudgets(id, year ? parseInt(year) : undefined);
    }

    // ==================== التحليلات ====================

    @Get(':id/analytics')
    @ApiOperation({ summary: 'تحليلات مركز التكلفة' })
    getAnalytics(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getAnalytics(id, req.user.companyId);
    }

    @Get(':id/employees')
    @ApiOperation({ summary: 'موظفي مركز التكلفة' })
    getEmployees(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getEmployeesByCostCenter(id, req.user.companyId);
    }

    @Get(':id/audit-log')
    @ApiOperation({ summary: 'سجل تدقيق مركز التكلفة' })
    @ApiQuery({ name: 'limit', required: false, description: 'عدد السجلات', example: '50' })
    getAuditLog(
        @Param('id') id: string,
        @Query('limit') limit: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getAuditLog(id, req.user.companyId, limit ? parseInt(limit) : 50);
    }

    // ==================== الدفعة الثانية - Batch 2 ====================

    @Get(':id/pnl-report')
    @ApiOperation({ summary: 'تقرير P&L لمركز التكلفة' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    getPnLReport(
        @Param('id') id: string,
        @Query('year') year: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getPnLReport(id, req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Get(':id/forecast')
    @ApiOperation({ summary: 'توقعات الميزانية' })
    getForecast(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getForecast(id, req.user.companyId);
    }

    @Post(':id/copy-budget')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'نسخ الميزانية من سنة سابقة' })
    async copyBudget(
        @Param('id') id: string,
        @Body() dto: { fromYear: number; toYear: number },
        @Req() req: AuthenticatedRequest,
    ) {
        const result = await this.costCentersService.copyBudget(id, dto.fromYear, dto.toYear, req.user.companyId);
        await this.costCentersService.logAudit({
            costCenterId: id,
            userId: req.user.id,
            action: 'BUDGET_COPY',
            entityType: 'BUDGET',
            newValue: result,
            description: `نسخ الميزانية من ${dto.fromYear} إلى ${dto.toYear}`,
        });
        return result;
    }

    @Get(':id/export-budgets')
    @ApiOperation({ summary: 'تصدير الميزانيات' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    exportBudgets(
        @Param('id') id: string,
        @Query('year') year: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.exportBudgets(id, req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Get(':id/validate-headcount')
    @ApiOperation({ summary: 'التحقق من حد الموظفين' })
    validateHeadcount(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.validateHeadcount(id, req.user.companyId);
    }

    // ==================== الدفعة الثالثة - Batch 3 ====================

    @Get(':id/trend-analysis')
    @ApiOperation({ summary: 'تحليل اتجاهات الميزانية' })
    @ApiQuery({ name: 'months', required: false, description: 'عدد الأشهر', example: '12' })
    getTrendAnalysis(
        @Param('id') id: string,
        @Query('months') months: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getTrendAnalysis(id, req.user.companyId, months ? parseInt(months) : 12);
    }

    @Get(':id/roi')
    @ApiOperation({ summary: 'تقرير عائد الاستثمار' })
    @ApiQuery({ name: 'year', required: false, description: 'السنة' })
    getROI(
        @Param('id') id: string,
        @Query('year') year: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getROI(id, req.user.companyId, year ? parseInt(year) : undefined);
    }

    @Post(':id/import-budgets')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'استيراد الميزانيات' })
    async importBudgets(
        @Param('id') id: string,
        @Body() dto: { budgets: Array<{ month: number; budgetAmount: number; actualAmount?: number }> },
        @Req() req: AuthenticatedRequest,
    ) {
        const result = await this.costCentersService.importBudgets(id, req.user.companyId, dto.budgets);
        await this.costCentersService.logAudit({
            costCenterId: id,
            userId: req.user.id,
            action: 'BUDGET_IMPORT',
            entityType: 'BUDGET',
            newValue: result,
            description: `استيراد ${result.created + result.updated} ميزانية`,
        });
        return result;
    }

    // ==================== الدفعة الرابعة - Batch 4 ====================

    @Get(':id/variance-alerts')
    @ApiOperation({ summary: 'تنبيهات الانحراف' })
    @ApiQuery({ name: 'threshold', required: false, description: 'نسبة الانحراف للتنبيه', example: '10' })
    getVarianceAlerts(
        @Param('id') id: string,
        @Query('threshold') threshold: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getVarianceAlerts(id, req.user.companyId, threshold ? parseInt(threshold) : 10);
    }

    @Get(':id/salary-breakdown')
    @ApiOperation({ summary: 'تفصيل الرواتب' })
    getSalaryBreakdown(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getSalaryBreakdown(id, req.user.companyId);
    }

    @Post(':id/what-if')
    @ApiOperation({ summary: 'تحليل ماذا لو' })
    whatIfAnalysis(
        @Param('id') id: string,
        @Body() dto: { salaryIncrease?: number; headcountChange?: number; budgetChange?: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.whatIfAnalysis(id, req.user.companyId, dto);
    }

    // ==================== الدفعة الخامسة - Batch 5 (Dynamic Routes) ====================

    @Post(':id/submit-budget')
    @ApiOperation({ summary: 'إرسال الميزانية للموافقة' })
    submitYearlyBudget(
        @Param('id') id: string,
        @Body() dto: { year: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.submitYearlyBudgetForApproval(id, req.user.companyId, dto.year, req.user.id);
    }

    @Post(':id/approve-budget')
    @ApiOperation({ summary: 'اعتماد الميزانية' })
    approveYearlyBudget(
        @Param('id') id: string,
        @Body() dto: { year: number },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.approveYearlyBudget(id, req.user.companyId, dto.year, req.user.id);
    }

    @Post(':id/reject-budget')
    @ApiOperation({ summary: 'رفض الميزانية' })
    rejectYearlyBudget(
        @Param('id') id: string,
        @Body() dto: { year: number; reason: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.rejectYearlyBudget(id, req.user.companyId, dto.year, req.user.id, dto.reason);
    }

    @Post(':id/amend-budget')
    @ApiOperation({ summary: 'تعديل الميزانية' })
    amendBudget(
        @Param('id') id: string,
        @Body() dto: { month: number; year: number; newAmount: number; reason: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.amendBudget(id, req.user.companyId, dto.month, dto.year, dto.newAmount, dto.reason, req.user.id);
    }

    @Post(':id/lock-budget')
    @ApiOperation({ summary: 'قفل/فتح الميزانية' })
    lockBudget(
        @Param('id') id: string,
        @Body() dto: { year: number; lock: boolean },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.lockBudget(id, req.user.companyId, dto.year, dto.lock);
    }

    @Get(':id/compare-periods')
    @ApiOperation({ summary: 'مقارنة الفترات' })
    @ApiQuery({ name: 'year1', required: true })
    @ApiQuery({ name: 'year2', required: true })
    comparePeriods(
        @Param('id') id: string,
        @Query('year1') year1: string,
        @Query('year2') year2: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.comparePeriods(id, req.user.companyId, parseInt(year1), parseInt(year2));
    }

    // ==================== الدفعة السابعة - Batch 7 ====================

    @Get(':id/performance-score')
    @ApiOperation({ summary: 'تقييم أداء مركز التكلفة' })
    getPerformanceScore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.costCentersService.getPerformanceScore(id, req.user.companyId);
    }

    @Get(':id/drill-down')
    @ApiOperation({ summary: 'تحليلات متعمقة' })
    @ApiQuery({ name: 'level', required: true, description: 'employee | month | category' })
    getDrillDownAnalytics(
        @Param('id') id: string,
        @Query('level') level: 'employee' | 'month' | 'category',
        @Req() req: AuthenticatedRequest,
    ) {
        return this.costCentersService.getDrillDownAnalytics(id, req.user.companyId, level);
    }
}

