import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GosiService } from './gosi.service';
import { CreateGosiConfigDto } from './dto/create-gosi-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('GOSI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gosi')
export class GosiController {
    constructor(private readonly service: GosiService) { }

    @Post('config')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة إعدادات تأمينات جديدة' })
    create(@Body() dto: CreateGosiConfigDto) {
        return this.service.create(dto);
    }

    @Get('config/active')
    @ApiOperation({ summary: 'الحصول على الإعدادات المفعلة حالياً' })
    getActiveConfig() {
        return this.service.getActiveConfig();
    }

    @Get('configs')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'عرض سجل الإعدادات' })
    findAll() {
        return this.service.findAll();
    }

    @Patch('config/:id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث إعداد معين' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateGosiConfigDto>) {
        return this.service.update(id, dto);
    }
}
