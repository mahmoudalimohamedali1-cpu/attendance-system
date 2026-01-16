import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GosiService } from './gosi.service';
import { GosiCalculationService } from './gosi-calculation.service';
import { GosiValidationService, GOSI_LEGAL_RATES } from './gosi-validation.service';
import { CreateGosiConfigDto } from './dto/create-gosi-config.dto';
import { ValidateGosiDto, CreateStandardGosiConfigDto } from './dto/validate-gosi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('GOSI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gosi')
export class GosiController {
    constructor(
        private readonly service: GosiService,
        private readonly calculationService: GosiCalculationService,
        private readonly validationService: GosiValidationService,
    ) { }

    @Post('config')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة إعدادات تأمينات جديدة' })
    create(
        @Body() dto: CreateGosiConfigDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.create(dto, companyId);
    }

    @Get('config/active')
    @ApiOperation({ summary: 'الحصول على الإعدادات المفعلة حالياً' })
    getActiveConfig(@CurrentUser('companyId') companyId: string) {
        return this.service.getActiveConfig(companyId);
    }

    @Get('configs')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'عرض سجل الإعدادات' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Patch('config/:id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث إعداد معين' })
    update(
        @Param('id') id: string,
        @Body() dto: Partial<CreateGosiConfigDto>,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.service.update(id, dto, companyId);
    }

    @Get('report/:runId')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تقرير اشتراكات التأمينات لمسير معين' })
    async getReport(
        @Param('runId') runId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.calculationService.generateReport(runId, companyId);
    }

    // ============================================
    // Validation Gate Endpoints
    // ============================================

    @Post('validate')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من صحة إعدادات GOSI قبل حساب الرواتب' })
    async validateConfig(
        @Body() dto: ValidateGosiDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        const periodStartDate = dto.periodStartDate
            ? new Date(dto.periodStartDate)
            : new Date();

        return this.validationService.validateForPayroll(companyId, periodStartDate, {
            strictMode: dto.strictMode,
            allowExpired: dto.allowExpired,
        });
    }

    @Get('validate/quick')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحقق سريع من وجود وصحة إعدادات GOSI' })
    async quickValidate(@CurrentUser('companyId') companyId: string) {
        return this.validationService.quickValidate(companyId);
    }

    @Get('legal-rates')
    @ApiOperation({ summary: 'الحصول على النسب القانونية المعتمدة من التأمينات' })
    getLegalRates() {
        return {
            rates: GOSI_LEGAL_RATES,
            description: {
                EMPLOYEE_PENSION: 'نسبة معاش الموظف',
                EMPLOYEE_SANED: 'نسبة ساند للموظف',
                EMPLOYEE_TOTAL: 'إجمالي نسبة الموظف',
                EMPLOYER_PENSION: 'نسبة معاش صاحب العمل',
                EMPLOYER_SANED: 'نسبة ساند لصاحب العمل',
                EMPLOYER_HAZARD: 'نسبة الأخطار المهنية',
                EMPLOYER_TOTAL: 'إجمالي نسبة صاحب العمل',
                MAX_CAP_AMOUNT: 'الحد الأقصى للراتب الخاضع',
                MIN_BASE_SALARY: 'الحد الأدنى للراتب الخاضع',
            },
            lastUpdated: '2024-01-01',
            source: 'General Organization for Social Insurance (GOSI)',
        };
    }

    @Get('standard-config')
    @ApiOperation({ summary: 'الحصول على الإعدادات القياسية الموصى بها' })
    getStandardConfig() {
        return {
            config: this.validationService.getStandardConfig(),
            description: 'الإعدادات القياسية المطابقة لنظام التأمينات الاجتماعية السعودي',
        };
    }

    @Post('config/standard')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء إعدادات GOSI قياسية بالنسب القانونية' })
    async createStandardConfig(
        @Body() dto: CreateStandardGosiConfigDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        const standardConfig = this.validationService.getStandardConfig();

        return this.service.create(
            {
                employeeRate: standardConfig.employeeRate,
                employerRate: standardConfig.employerRate,
                sanedRate: standardConfig.sanedRate,
                hazardRate: standardConfig.hazardRate,
                maxCapAmount: standardConfig.maxCapAmount,
                isSaudiOnly: standardConfig.isSaudiOnly,
                isActive: true,
            },
            companyId,
        );
    }
}
