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
import { SalaryStructuresService } from './salary-structures.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from './dto/update-salary-structure.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Salary Structures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salary-structures')
export class SalaryStructuresController {
    constructor(private readonly service: SalaryStructuresService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء هيكل راتب جديد' })
    create(@Body() dto: CreateSalaryStructureDto, @CurrentUser('companyId') companyId: string) {
        return this.service.create(dto, companyId);
    }

    @Get()
    @ApiOperation({ summary: 'عرض كل هياكل الرواتب' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'عرض تفاصيل هيكل' })
    findOne(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findOne(id, companyId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث هيكل' })
    update(@Param('id') id: string, @CurrentUser('companyId') companyId: string, @Body() dto: UpdateSalaryStructureDto) {
        return this.service.update(id, companyId, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف هيكل' })
    remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.remove(id, companyId);
    }
}
