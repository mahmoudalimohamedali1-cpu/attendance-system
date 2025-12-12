import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { WorkFromHomeDto } from './dto/work-from-home.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  // ============ Employee Endpoints ============

  @Post()
  @ApiOperation({ summary: 'إنشاء طلب إجازة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  async createLeaveRequest(
    @CurrentUser('id') userId: string,
    @Body() createLeaveDto: CreateLeaveRequestDto,
  ) {
    return this.leavesService.createLeaveRequest(userId, createLeaveDto);
  }

  @Get('my')
  @ApiOperation({ summary: 'طلبات الإجازة الخاصة بي' })
  @ApiResponse({ status: 200, description: 'قائمة طلبات الإجازة' })
  async getMyLeaveRequests(
    @CurrentUser('id') userId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getMyLeaveRequests(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  async getLeaveRequestById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.getLeaveRequestById(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'إلغاء طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء بنجاح' })
  async cancelLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.cancelLeaveRequest(id, userId);
  }

  // ============ Manager/Admin Endpoints ============

  @Get('pending/all')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الطلبات المعلقة' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة' })
  async getPendingRequests(
    @CurrentUser('id') userId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getPendingRequests(userId, query);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الموافقة على طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.approveLeaveRequest(id, approverId, approveDto.notes);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'رفض طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تم الرفض' })
  async rejectLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.rejectLeaveRequest(id, approverId, approveDto.notes);
  }

  @Get('admin/all')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'جميع طلبات الإجازة' })
  @ApiResponse({ status: 200, description: 'قائمة جميع الطلبات' })
  async getAllLeaveRequests(@Query() query: LeaveQueryDto) {
    return this.leavesService.getAllLeaveRequests(query);
  }

  // ============ Work From Home ============

  @Post('work-from-home')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تفعيل العمل من المنزل لموظف' })
  @ApiResponse({ status: 201, description: 'تم التفعيل' })
  async enableWorkFromHome(
    @CurrentUser('id') approverId: string,
    @Body() wfhDto: WorkFromHomeDto,
  ) {
    return this.leavesService.enableWorkFromHome(
      wfhDto.userId,
      new Date(wfhDto.date),
      wfhDto.reason,
      approverId,
    );
  }

  @Delete('work-from-home/:userId/:date')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'إلغاء العمل من المنزل' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء' })
  async disableWorkFromHome(
    @Param('userId') userId: string,
    @Param('date') date: string,
  ) {
    return this.leavesService.disableWorkFromHome(userId, new Date(date));
  }
}

