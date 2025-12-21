import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdvancesService } from './advances.service';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { UploadService } from '../../common/upload/upload.service';
import { CreateAdvanceRequestDto, ManagerDecisionDto, HrDecisionDto } from './dto/advance-request.dto';

@ApiTags('Advances - السلف')
@Controller('advances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvancesController {
    constructor(
        private readonly advancesService: AdvancesService,
        private readonly uploadService: UploadService,
    ) { }

    @Post('upload-attachments')
    @ApiOperation({ summary: 'رفع مرفقات طلب السلفة' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'تم رفع الملفات بنجاح' })
    @UseInterceptors(FilesInterceptor('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 }
    }))
    async uploadAttachments(
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const uploadedFiles = await this.uploadService.uploadAdvanceAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }

    // ==================== طلب جديد ====================

    @Post()
    @ApiOperation({ summary: 'تقديم طلب سلفة جديد' })
    @ApiResponse({ status: 201, description: 'تم إنشاء الطلب' })
    async createRequest(
        @Request() req: any,
        @Body() dto: CreateAdvanceRequestDto,
    ) {
        return this.advancesService.createAdvanceRequest(req.user.id, req['tenantId'], dto);
    }

    // ==================== طلباتي ====================

    @Get('my')
    @ApiOperation({ summary: 'طلبات السلف الخاصة بي' })
    @ApiResponse({ status: 200, description: 'قائمة الطلبات' })
    async getMyRequests(@Request() req: any) {
        return this.advancesService.getMyRequests(req.user.id, req['tenantId']);
    }

    // ==================== صندوق المدير ====================

    @Get('inbox/manager')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'صندوق الوارد للمدير' })
    @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة' })
    async getManagerInbox(@Request() req: any) {
        return this.advancesService.getManagerInbox(req.user.id, req.user.companyId);
    }

    @Post(':id/manager-decision')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'قرار المدير' })
    @ApiResponse({ status: 200, description: 'تم تسجيل القرار' })
    async managerDecision(
        @Param('id') id: string,
        @Request() req: any,
        @Body() dto: ManagerDecisionDto,
    ) {
        return this.advancesService.managerDecision(id, req['tenantId'], req.user.id, dto);
    }

    // ==================== صندوق HR ====================

    @Get('inbox/hr')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'صندوق الوارد لـ HR' })
    @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة' })
    async getHRInbox(@Request() req: any) {
        return this.advancesService.getHRInbox(req.user.id, req.user.companyId);
    }

    @Post(':id/hr-decision')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'قرار HR' })
    @ApiResponse({ status: 200, description: 'تم تسجيل القرار' })
    async hrDecision(
        @Param('id') id: string,
        @Request() req: any,
        @Body() dto: HrDecisionDto,
    ) {
        return this.advancesService.hrDecision(id, req['tenantId'], req.user.id, dto);
    }

    // ==================== تفاصيل الطلب ====================

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل طلب سلفة' })
    @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
    async getRequestDetails(@Param('id') id: string, @Request() req: any) {
        return this.advancesService.getRequestDetails(id, req['tenantId']);
    }

    // ==================== السلف السابقة للموظف (لـ HR) ====================

    @Get('employee/:employeeId/history')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'السلف السابقة لموظف' })
    @ApiResponse({ status: 200, description: 'قائمة السلف السابقة' })
    async getEmployeePreviousAdvances(@Param('employeeId') employeeId: string, @Request() req: any) {
        return this.advancesService.getEmployeePreviousAdvances(employeeId, req['tenantId']);
    }
}
