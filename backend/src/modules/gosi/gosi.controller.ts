import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GosiService } from './gosi.service';
import { GosiCalculationService } from './gosi-calculation.service';
import { CreateGosiConfigDto } from './dto/create-gosi-config.dto';
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
}
