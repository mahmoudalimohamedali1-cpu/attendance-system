import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyConfigService } from './company-config.service';
import { CreateCompanyConfigDto, UpdateCompanyConfigDto, CompanyType } from './dto';

@Controller('company-config')
@UseGuards(JwtAuthGuard)
export class CompanyConfigController {
    constructor(private readonly service: CompanyConfigService) { }

    // ============ Templates (STATIC - MUST BE FIRST) ============

    @Get('templates/available')
    async getAvailableTemplates() {
        return this.service.getAvailableTemplates();
    }

    @Post('templates/seed')
    async seedTemplates() {
        return this.service.seedEvaluationTemplates();
    }

    // ============ Role Levels (STATIC - BEFORE :companyId) ============

    @Get('job-families/:jobFamilyId/role-levels')
    async getRoleLevels(@Param('jobFamilyId') jobFamilyId: string) {
        return this.service.getRoleLevels(jobFamilyId);
    }

    @Post('job-families/:jobFamilyId/role-levels')
    async createRoleLevel(
        @Param('jobFamilyId') jobFamilyId: string,
        @Body() data: {
            code: string;
            name: string;
            nameAr?: string;
            rank: number;
            isManager?: boolean;
            weightOverrides?: Record<string, number>;
        },
    ) {
        return this.service.createRoleLevel(jobFamilyId, data);
    }

    // ============ Company Config (DYNAMIC :companyId) ============

    @Get(':companyId')
    async getConfig(@Param('companyId') companyId: string) {
        return this.service.getByCompanyId(companyId);
    }

    @Post()
    async createConfig(@Body() dto: CreateCompanyConfigDto) {
        return this.service.create(dto);
    }

    @Put(':companyId')
    async updateConfig(
        @Param('companyId') companyId: string,
        @Body() dto: UpdateCompanyConfigDto,
    ) {
        return this.service.update(companyId, dto);
    }

    @Post(':companyId/apply-template')
    async applyTemplate(
        @Param('companyId') companyId: string,
        @Body('companyType') companyType: CompanyType,
    ) {
        return this.service.applyTemplate(companyId, companyType);
    }

    // ============ Employee Blueprint ============

    @Get(':companyId/blueprint/:employeeId')
    async getEmployeeBlueprint(
        @Param('companyId') companyId: string,
        @Param('employeeId') employeeId: string,
        @Query('cycleId') cycleId?: string,
    ) {
        return this.service.getEmployeeBlueprint(companyId, employeeId, cycleId);
    }

    // ============ Job Families ============

    @Get(':companyId/job-families')
    async getJobFamilies(@Param('companyId') companyId: string) {
        return this.service.getJobFamilies(companyId);
    }

    @Post(':companyId/job-families')
    async createJobFamily(
        @Param('companyId') companyId: string,
        @Body() data: {
            code: string;
            name: string;
            nameAr?: string;
            moduleOverrides?: Record<string, boolean>;
            evidenceTypes?: string[];
        },
    ) {
        return this.service.createJobFamily(companyId, data);
    }
}
