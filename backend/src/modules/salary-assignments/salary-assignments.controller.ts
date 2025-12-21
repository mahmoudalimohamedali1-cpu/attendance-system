import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalaryAssignmentsService } from './salary-assignments.service';
import { CreateSalaryAssignmentDto } from './dto/create-salary-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Salary Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salary-assignments')
export class SalaryAssignmentsController {
    constructor(private readonly service: SalaryAssignmentsService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تخصيص هيكل راتب لموظف' })
    create(@Body() dto: CreateSalaryAssignmentDto, @CurrentUser('companyId') companyId: string) {
        return this.service.create(dto, companyId);
    }

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'عرض كل تخصيصات الرواتب' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get('all')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'عرض كل تخصيصات الرواتب - endpoint بديل' })
    findAllAlt(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get('employee/:id')
    @ApiOperation({ summary: 'عرض تخصيصات موظف معين' })
    findByEmployee(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findByEmployee(id, companyId);
    }

    @Get('employee/:id/active')
    @ApiOperation({ summary: 'عرض التخصيص النشط لموظف معين' })
    findActive(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.findActive(id, companyId);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف تخصيص' })
    remove(@Param('id') id: string, @CurrentUser('companyId') companyId: string) {
        return this.service.remove(id, companyId);
    }
}
