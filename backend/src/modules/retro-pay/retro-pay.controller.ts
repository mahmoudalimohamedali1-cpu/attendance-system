import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RetroPayService } from './retro-pay.service';
import { CreateRetroPayDto } from './dto/create-retro-pay.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Retro Pay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('retro-pay')
export class RetroPayController {
    constructor(private readonly service: RetroPayService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء طلب فرق راتب' })
    create(@Body() dto: CreateRetroPayDto, @Request() req: any) {
        return this.service.create(dto, req.user.id);
    }

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'عرض جميع طلبات الفروقات' })
    findAll() {
        return this.service.findAll();
    }

    @Get('stats')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إحصائيات الفروقات' })
    getStats() {
        return this.service.getStats();
    }

    @Get('employee/:employeeId')
    @ApiOperation({ summary: 'فروقات موظف معين' })
    findByEmployee(@Param('employeeId') employeeId: string) {
        return this.service.findByEmployee(employeeId);
    }

    @Patch(':id/approve')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'اعتماد طلب فرق' })
    approve(@Param('id') id: string, @Request() req: any) {
        return this.service.approve(id, req.user.id);
    }

    @Patch(':id/pay')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تسجيل صرف الفرق' })
    markAsPaid(@Param('id') id: string) {
        return this.service.markAsPaid(id);
    }

    @Patch(':id/cancel')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إلغاء طلب فرق' })
    cancel(@Param('id') id: string) {
        return this.service.cancel(id);
    }
}
