import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
    constructor(private readonly branchesService: BranchesService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إنشاء قسم جديد' })
    @ApiResponse({ status: 201, description: 'تم إنشاء القسم بنجاح' })
    async create(
        @Body() createDepartmentDto: CreateDepartmentDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.branchesService.createDepartment(createDepartmentDto, companyId);
    }

    @Get()
    @ApiOperation({ summary: 'قائمة الأقسام' })
    @ApiResponse({ status: 200, description: 'قائمة الأقسام' })
    async findAll(
        @CurrentUser('companyId') companyId: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.branchesService.findAllDepartments(companyId, branchId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تعديل قسم' })
    @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
    async update(
        @Param('id') id: string,
        @Body() updateData: Partial<CreateDepartmentDto>,
    ) {
        return this.branchesService.updateDepartment(id, updateData);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف قسم' })
    @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
    async remove(@Param('id') id: string) {
        return this.branchesService.deleteDepartment(id);
    }
}
