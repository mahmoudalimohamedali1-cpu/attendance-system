import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import {
    CreateProjectDto,
    UpdateProjectDto,
    AddProjectMemberDto,
    CreatePhaseDto,
    CreateMilestoneDto,
    CreateRiskDto,
    CreateBudgetDto,
} from './dto/create-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    // ==================== PROJECTS ====================

    @Post()
    @ApiOperation({ summary: 'إنشاء مشروع جديد' })
    create(@Request() req: any, @Body() dto: CreateProjectDto) {
        return this.projectsService.createProject(req.user.companyId, dto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'جلب جميع المشاريع' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'priority', required: false })
    @ApiQuery({ name: 'programId', required: false })
    @ApiQuery({ name: 'managerId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    findAll(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('programId') programId?: string,
        @Query('managerId') managerId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.projectsService.findAllProjects(req.user.companyId, {
            status,
            priority,
            programId,
            managerId,
            search,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get('portfolio/dashboard')
    @ApiOperation({ summary: 'لوحة تحكم المحفظة' })
    getPortfolioDashboard(@Request() req: any) {
        return this.projectsService.getPortfolioDashboard(req.user.companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'جلب مشروع بالمعرف' })
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.projectsService.findProjectById(req.user.companyId, id);
    }

    @Get(':id/dashboard')
    @ApiOperation({ summary: 'لوحة تحكم المشروع' })
    getProjectDashboard(@Request() req: any, @Param('id') id: string) {
        return this.projectsService.getProjectDashboard(req.user.companyId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'تحديث مشروع' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
        return this.projectsService.updateProject(req.user.companyId, id, dto, req.user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف مشروع' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.projectsService.deleteProject(req.user.companyId, id);
    }

    // ==================== MEMBERS ====================

    @Post(':id/members')
    @ApiOperation({ summary: 'إضافة عضو للمشروع' })
    addMember(@Request() req: any, @Param('id') id: string, @Body() dto: AddProjectMemberDto) {
        return this.projectsService.addMember(req.user.companyId, id, dto, req.user.id);
    }

    @Put('members/:memberId')
    @ApiOperation({ summary: 'تحديث بيانات عضو' })
    updateMember(
        @Request() req: any,
        @Param('memberId') memberId: string,
        @Body() dto: Partial<AddProjectMemberDto>,
    ) {
        return this.projectsService.updateMember(req.user.companyId, memberId, dto);
    }

    @Delete(':id/members/:memberId')
    @ApiOperation({ summary: 'إزالة عضو من المشروع' })
    removeMember(
        @Request() req: any,
        @Param('id') id: string,
        @Param('memberId') memberId: string,
    ) {
        return this.projectsService.removeMember(req.user.companyId, id, memberId, req.user.id);
    }

    // ==================== PHASES ====================

    @Post(':id/phases')
    @ApiOperation({ summary: 'إنشاء مرحلة جديدة' })
    createPhase(@Request() req: any, @Param('id') id: string, @Body() dto: CreatePhaseDto) {
        return this.projectsService.createPhase(req.user.companyId, id, dto, req.user.id);
    }

    @Put('phases/:phaseId')
    @ApiOperation({ summary: 'تحديث مرحلة' })
    updatePhase(
        @Request() req: any,
        @Param('phaseId') phaseId: string,
        @Body() dto: Partial<CreatePhaseDto>,
    ) {
        return this.projectsService.updatePhase(req.user.companyId, phaseId, dto, req.user.id);
    }

    @Delete('phases/:phaseId')
    @ApiOperation({ summary: 'حذف مرحلة' })
    deletePhase(@Request() req: any, @Param('phaseId') phaseId: string) {
        return this.projectsService.deletePhase(req.user.companyId, phaseId, req.user.id);
    }

    // ==================== MILESTONES ====================

    @Post(':id/milestones')
    @ApiOperation({ summary: 'إنشاء معلم جديد' })
    createMilestone(@Request() req: any, @Param('id') id: string, @Body() dto: CreateMilestoneDto) {
        return this.projectsService.createMilestone(req.user.companyId, id, dto, req.user.id);
    }

    @Put('milestones/:milestoneId')
    @ApiOperation({ summary: 'تحديث معلم' })
    updateMilestone(
        @Request() req: any,
        @Param('milestoneId') milestoneId: string,
        @Body() dto: Partial<CreateMilestoneDto>,
    ) {
        return this.projectsService.updateMilestone(req.user.companyId, milestoneId, dto, req.user.id);
    }

    @Post('milestones/:milestoneId/complete')
    @ApiOperation({ summary: 'إكمال معلم' })
    completeMilestone(@Request() req: any, @Param('milestoneId') milestoneId: string) {
        return this.projectsService.completeMilestone(req.user.companyId, milestoneId, req.user.id);
    }

    // ==================== RISKS ====================

    @Post(':id/risks')
    @ApiOperation({ summary: 'إنشاء خطر جديد' })
    createRisk(@Request() req: any, @Param('id') id: string, @Body() dto: CreateRiskDto) {
        return this.projectsService.createRisk(req.user.companyId, id, dto, req.user.id);
    }

    @Put('risks/:riskId')
    @ApiOperation({ summary: 'تحديث خطر' })
    updateRisk(
        @Request() req: any,
        @Param('riskId') riskId: string,
        @Body() dto: Partial<CreateRiskDto>,
    ) {
        return this.projectsService.updateRisk(req.user.companyId, riskId, dto, req.user.id);
    }

    // ==================== BUDGETS ====================

    @Post(':id/budgets')
    @ApiOperation({ summary: 'إنشاء بند ميزانية جديد' })
    createBudget(@Request() req: any, @Param('id') id: string, @Body() dto: CreateBudgetDto) {
        return this.projectsService.createBudget(req.user.companyId, id, dto, req.user.id);
    }

    @Put('budgets/:budgetId')
    @ApiOperation({ summary: 'تحديث بند ميزانية' })
    updateBudget(
        @Request() req: any,
        @Param('budgetId') budgetId: string,
        @Body() dto: Partial<CreateBudgetDto>,
    ) {
        return this.projectsService.updateBudget(req.user.companyId, budgetId, dto, req.user.id);
    }
}
