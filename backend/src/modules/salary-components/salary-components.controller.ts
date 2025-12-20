import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalaryComponentsService } from './salary-components.service';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto';
import { UpdateSalaryComponentDto } from './dto/update-salary-component.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Salary Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salary-components')
export class SalaryComponentsController {
    constructor(private readonly service: SalaryComponentsService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء مكون راتب جديد' })
    create(@Body() dto: CreateSalaryComponentDto, @CurrentUser('companyId') companyId: string) {
        return this.service.create(dto, companyId);
    }

    @Get()
    @ApiOperation({ summary: 'عرض كل مكونات الراتب' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'عرض تفاصيل مكون' })
    findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findOne(id, companyId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث مكون' })
    update(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: UpdateSalaryComponentDto) {
        return this.service.update(id, companyId, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف مكون' })
    remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.remove(id, companyId);
    }
}
