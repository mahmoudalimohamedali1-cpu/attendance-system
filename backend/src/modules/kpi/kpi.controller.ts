/**
 * KPI Controller
 * REST API endpoints for KPI Engine
 */

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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KPIService } from './kpi.service';
import {
    CreateKPIDefinitionDto,
    UpdateKPIDefinitionDto,
    CreateKPIAssignmentDto,
    BulkCreateKPIAssignmentDto,
    UpdateKPIAssignmentDto,
    CreateKPIEntryDto,
    BulkCreateKPIEntryDto,
    ImportKPIEntriesDto,
    GetKPIDefinitionsQueryDto,
    GetKPIAssignmentsQueryDto,
    RecalculateAllScoresDto,
} from './dto';

@Controller('kpi')
@UseGuards(JwtAuthGuard)
export class KPIController {
    constructor(private readonly kpiService: KPIService) { }

    // ==================== KPI Definitions ====================

    @Post('definitions')
    async createDefinition(@Body() dto: CreateKPIDefinitionDto) {
        return this.kpiService.createDefinition(dto);
    }

    @Get('definitions/:companyId')
    async getDefinitions(
        @Param('companyId') companyId: string,
        @Query() query: GetKPIDefinitionsQueryDto,
    ) {
        return this.kpiService.getDefinitions(companyId, query);
    }

    @Get('definitions/detail/:id')
    async getDefinitionById(@Param('id') id: string) {
        return this.kpiService.getDefinitionById(id);
    }

    @Put('definitions/:id')
    async updateDefinition(
        @Param('id') id: string,
        @Body() dto: UpdateKPIDefinitionDto,
    ) {
        return this.kpiService.updateDefinition(id, dto);
    }

    @Delete('definitions/:id')
    async deleteDefinition(@Param('id') id: string) {
        return this.kpiService.deleteDefinition(id);
    }

    @Post('definitions/seed/:companyId')
    async seedDefaultKPIs(@Param('companyId') companyId: string) {
        return this.kpiService.seedDefaultKPIs(companyId);
    }

    // ==================== KPI Assignments ====================

    @Post('assignments')
    async createAssignment(@Body() dto: CreateKPIAssignmentDto) {
        return this.kpiService.createAssignment(dto);
    }

    @Post('assignments/bulk')
    async bulkCreateAssignments(@Body() dto: BulkCreateKPIAssignmentDto) {
        return this.kpiService.bulkCreateAssignments(dto);
    }

    @Get('assignments')
    async getAssignments(@Query() query: GetKPIAssignmentsQueryDto) {
        return this.kpiService.getAssignments(query);
    }

    @Get('assignments/:id')
    async getAssignmentById(@Param('id') id: string) {
        return this.kpiService.getAssignmentById(id);
    }

    @Put('assignments/:id')
    async updateAssignment(
        @Param('id') id: string,
        @Body() dto: UpdateKPIAssignmentDto,
    ) {
        return this.kpiService.updateAssignment(id, dto);
    }

    @Delete('assignments/:id')
    async deleteAssignment(@Param('id') id: string) {
        return this.kpiService.deleteAssignment(id);
    }

    // ==================== KPI Entries ====================

    @Post('entries')
    async createEntry(@Body() dto: CreateKPIEntryDto, @Request() req: any) {
        return this.kpiService.createEntry(dto, req.user.id);
    }

    @Post('entries/bulk')
    async bulkCreateEntries(@Body() dto: BulkCreateKPIEntryDto, @Request() req: any) {
        return this.kpiService.bulkCreateEntries(dto, req.user.id);
    }

    @Post('entries/import')
    async importEntries(@Body() dto: ImportKPIEntriesDto, @Request() req: any) {
        return this.kpiService.importEntries(dto, req.user.id);
    }

    @Get('entries/:assignmentId')
    async getEntriesForAssignment(@Param('assignmentId') assignmentId: string) {
        return this.kpiService.getEntriesForAssignment(assignmentId);
    }

    @Delete('entries/:id')
    async deleteEntry(@Param('id') id: string) {
        return this.kpiService.deleteEntry(id);
    }

    // ==================== Score Calculation ====================

    @Post('calculate/:assignmentId')
    async calculateScore(@Param('assignmentId') assignmentId: string) {
        return this.kpiService.calculateAssignmentScore(assignmentId);
    }

    @Post('recalculate-all')
    async recalculateAllScores(@Body() dto: RecalculateAllScoresDto) {
        return this.kpiService.recalculateAllScores(dto.cycleId, dto.employeeId);
    }

    // ==================== Analytics ====================

    @Get('summary/employee/:employeeId')
    async getEmployeeSummary(
        @Param('employeeId') employeeId: string,
        @Query('cycleId') cycleId?: string,
    ) {
        return this.kpiService.getEmployeeKPISummary(employeeId, cycleId);
    }

    @Get('overview/cycle/:cycleId')
    async getCycleOverview(@Param('cycleId') cycleId: string) {
        return this.kpiService.getCycleKPIOverview(cycleId);
    }
}
