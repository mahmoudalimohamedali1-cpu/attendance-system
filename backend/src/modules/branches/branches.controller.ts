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
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // ============ Branch Endpoints ============

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إنشاء فرع جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الفرع بنجاح' })
  async createBranch(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.createBranch(createBranchDto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الفروع' })
  @ApiResponse({ status: 200, description: 'قائمة الفروع' })
  async findAllBranches() {
    return this.branchesService.findAllBranches();
  }

  @Get(':id')
  @ApiOperation({ summary: 'بيانات فرع محدد' })
  @ApiResponse({ status: 200, description: 'بيانات الفرع' })
  async findBranchById(@Param('id') id: string) {
    return this.branchesService.findBranchById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل فرع' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateBranch(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.branchesService.updateBranch(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف فرع' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteBranch(@Param('id') id: string) {
    return this.branchesService.deleteBranch(id);
  }

  @Patch(':id/toggle-status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تفعيل/تعطيل فرع' })
  @ApiResponse({ status: 200, description: 'تم تغيير الحالة' })
  async toggleBranchStatus(@Param('id') id: string) {
    return this.branchesService.toggleBranchStatus(id);
  }

  // ============ Schedule Endpoints ============

  @Get(':id/schedule')
  @ApiOperation({ summary: 'جدول عمل الفرع' })
  @ApiResponse({ status: 200, description: 'جدول العمل' })
  async getBranchSchedule(@Param('id') id: string) {
    return this.branchesService.getBranchSchedule(id);
  }

  @Patch(':id/schedule')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل جدول عمل الفرع' })
  @ApiResponse({ status: 200, description: 'تم تعديل الجدول' })
  async updateBranchSchedule(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.branchesService.updateBranchSchedule(id, updateScheduleDto.schedules);
  }

  // ============ Department Endpoints ============

  @Post('departments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'إنشاء قسم جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء القسم بنجاح' })
  async createDepartment(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.branchesService.createDepartment(createDepartmentDto);
  }

  @Get('departments/all')
  @ApiOperation({ summary: 'قائمة الأقسام' })
  @ApiResponse({ status: 200, description: 'قائمة الأقسام' })
  async findAllDepartments(@Query('branchId') branchId?: string) {
    return this.branchesService.findAllDepartments(branchId);
  }

  @Patch('departments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل قسم' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateDepartmentDto>,
  ) {
    return this.branchesService.updateDepartment(id, updateData);
  }

  @Delete('departments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف قسم' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteDepartment(@Param('id') id: string) {
    return this.branchesService.deleteDepartment(id);
  }
}

