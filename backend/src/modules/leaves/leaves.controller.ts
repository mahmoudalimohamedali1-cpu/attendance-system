import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
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
import { UploadService } from '../../common/upload/upload.service';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
    private readonly uploadService: UploadService,
  ) { }

  // ============ Employee Endpoints ============

  @Post('upload-attachments')
  @ApiOperation({ summary: 'رفع مرفقات طلب الإجازة' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'تم رفع الملفات بنجاح' })
  @UseInterceptors(FilesInterceptor('files', 5, {
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  })) // 5 ملفات كحد أقصى
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploadedFiles = await this.uploadService.uploadLeaveAttachments(files);
    return {
      message: 'تم رفع الملفات بنجاح',
      files: uploadedFiles,
    };
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء طلب إجازة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  async createLeaveRequest(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() createLeaveDto: CreateLeaveRequestDto,
    @Req() req: Request,
  ) {
    const rawBody = req.body as any;
    if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
      createLeaveDto.attachments = rawBody.attachments;
    }
    return this.leavesService.createLeaveRequest(userId, companyId, createLeaveDto);
  }

  @Get()
  @ApiOperation({ summary: 'طلبات الإجازة الخاصة بي' })
  @ApiResponse({ status: 200, description: 'قائمة طلبات الإجازة' })
  async getLeaves(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getMyLeaveRequests(userId, companyId, query);
  }

  @Get('my')
  @ApiOperation({ summary: 'طلبات الإجازة الخاصة بي' })
  @ApiResponse({ status: 200, description: 'قائمة طلبات الإجازة' })
  async getMyLeaveRequests(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getMyLeaveRequests(userId, companyId, query);
  }

  @Get('my/balances')
  @ApiOperation({ summary: 'أرصدة الإجازات الخاصة بي' })
  @ApiResponse({ status: 200, description: 'أرصدة جميع أنواع الإجازات مع التفاصيل' })
  async getMyLeaveBalances(
    @CurrentUser('id') userId: string,
    @Query('year') year?: number,
  ) {
    return this.leavesService.getEmployeeLeaveBalances(userId, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  async getLeaveRequestById(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.getLeaveRequestById(id, companyId, userId);
  }

  @Get(':id/context')
  @ApiOperation({ summary: 'تفاصيل طلب إجازة مع سياق الموظف (للمدير/HR)' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب مع بيانات الموظف الكاملة' })
  async getLeaveRequestWithEmployeeContext(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.getLeaveRequestWithEmployeeContext(id, companyId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'إلغاء طلب إجازة' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء بنجاح' })
  async cancelLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.cancelLeaveRequest(id, companyId, userId);
  }

  // ============ Permission-Based Endpoints (uses PermissionsService) ============

  @Get('pending/all')
  @ApiOperation({ summary: 'الطلبات المعلقة (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة التي لديك صلاحية عليها' })
  async getPendingRequests(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getPendingRequests(userId, companyId, query);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'الموافقة على طلب إجازة (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.approveLeaveRequest(id, companyId, approverId, approveDto?.notes);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'الموافقة على طلب إجازة (PUT alias)' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveLeaveRequestPut(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.approveLeaveRequest(id, companyId, approverId, approveDto?.notes);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'رفض طلب إجازة (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تم الرفض' })
  async rejectLeaveRequest(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.rejectLeaveRequest(id, companyId, approverId, approveDto.notes);
  }

  // ==================== Workflow Endpoints (Multi-Step Approval) ====================

  @Get('inbox/manager')
  @ApiOperation({ summary: 'طلبات تنتظر موافقة المدير' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقتك كمدير' })
  async getManagerInbox(
    @CurrentUser('id') managerId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.leavesService.getManagerInbox(managerId, companyId);
  }

  @Get('inbox/hr')
  @ApiOperation({ summary: 'طلبات تنتظر موافقة HR' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقة HR' })
  async getHRInbox(
    @CurrentUser('id') hrUserId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.leavesService.getHRInbox(hrUserId, companyId);
  }

  @Post(':id/manager-decision')
  @ApiOperation({ summary: 'قرار المدير على طلب الإجازة (موافقة/رفض)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل قرار المدير' })
  async managerDecision(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') managerId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; notes?: string },
  ) {
    return this.leavesService.managerDecision(id, companyId, managerId, body.decision, body.notes);
  }

  @Post(':id/hr-decision')
  @ApiOperation({ summary: 'قرار HR على طلب الإجازة (موافقة/رفض/تأجيل)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل قرار HR' })
  async hrDecision(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') hrUserId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string },
  ) {
    return this.leavesService.hrDecision(id, companyId, hrUserId, body.decision, body.notes);
  }

  // ============ Admin Only Endpoints ============

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'جميع طلبات الإجازة (للأدمن فقط)' })
  @ApiResponse({ status: 200, description: 'قائمة جميع الطلبات' })
  async getAllLeaveRequests(
    @CurrentUser('companyId') companyId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leavesService.getAllLeaveRequests(companyId, query);
  }

  @Post('admin/fix-entitlements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تصحيح استحقاقات الإجازات حسب نظام العمل السعودي' })
  @ApiResponse({ status: 200, description: 'تم تحديث الاستحقاقات' })
  async fixLeaveEntitlements(
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.leavesService.fixLeaveEntitlements(companyId);
  }

  // ============ Work From Home ============

  @Post('work-from-home')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تفعيل العمل من المنزل لموظف' })
  @ApiResponse({ status: 201, description: 'تم التفعيل' })
  async enableWorkFromHome(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') approverId: string,
    @Body() wfhDto: WorkFromHomeDto,
  ) {
    return this.leavesService.enableWorkFromHome(
      wfhDto.userId,
      companyId,
      new Date(wfhDto.date),
      wfhDto.reason,
      approverId,
    );
  }

  @Delete('work-from-home/:userId/:date')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'إلغاء العمل من المنزل' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء' })
  async disableWorkFromHome(
    @CurrentUser('companyId') companyId: string,
    @Param('userId') userId: string,
    @Param('date') date: string,
  ) {
    return this.leavesService.disableWorkFromHome(userId, companyId, new Date(date));
  }
}
