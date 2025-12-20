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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    @Post()
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'إنشاء شركة جديدة' })
    @ApiResponse({ status: 201, description: 'تم إنشاء الشركة بنجاح' })
    create(@Body() createCompanyDto: CreateCompanyDto) {
        return this.companiesService.create(createCompanyDto);
    }

    @Get()
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'الحصول على جميع الشركات' })
    @ApiResponse({ status: 200, description: 'قائمة الشركات' })
    findAll() {
        return this.companiesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'الحصول على بيانات شركة بالـ ID' })
    @ApiResponse({ status: 200, description: 'بيانات الشركة' })
    findOne(@Param('id') id: string) {
        return this.companiesService.findOne(id);
    }

    @Patch(':id')
    @Roles('SUPER_ADMIN', 'ADMIN')
    @ApiOperation({ summary: 'تحديث بيانات شركة' })
    @ApiResponse({ status: 200, description: 'تم التحديث بنجاح' })
    update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
        return this.companiesService.update(id, updateCompanyDto);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'حذف شركة' })
    @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
    remove(@Param('id') id: string) {
        return this.companiesService.remove(id);
    }
}
