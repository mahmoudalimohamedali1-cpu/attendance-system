import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    Query,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { RaisesService } from './raises.service';
import { CreateRaiseRequestDto } from './dto/create-raise-request.dto';
import { ManagerDecisionDto, HRDecisionDto } from './dto/raise-decision.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../common/upload/upload.service';

@ApiTags('raises')
@ApiBearerAuth()
@Controller('raises')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RaisesController {
    constructor(
        private readonly raisesService: RaisesService,
        private readonly uploadService: UploadService,
    ) { }

    // ============ Upload Endpoint ============

    @Post('upload-attachments')
    @ApiOperation({ summary: 'رفع مرفقات طلب الزيادة' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'تم رفع الملفات بنجاح' })
    @UseInterceptors(FilesInterceptor('files', 5, {
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB
    }))
    async uploadAttachments(
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const uploadedFiles = await this.uploadService.uploadRaiseAttachments(files);
        return {
            message: 'تم رفع الملفات بنجاح',
            files: uploadedFiles,
        };
    }

    // ============ Employee Endpoints ============

    @Post()
    @ApiOperation({ summary: 'إنشاء طلب زيادة' })
    @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
    async createRaiseRequest(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() createRaiseDto: CreateRaiseRequestDto,
    ) {
        return this.raisesService.createRaiseRequest(userId, companyId, createRaiseDto);
    }

    @Get('my')
    @ApiOperation({ summary: 'طلبات الزيادة الخاصة بي' })
    @ApiResponse({ status: 200, description: 'قائمة طلبات الزيادة' })
    async getMyRaiseRequests(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.getMyRaiseRequests(userId, companyId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'إحصائيات طلبات الزيادة' })
    async getStats(
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.getRaiseStats(userId, companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل طلب الزيادة' })
    async getRaiseRequestById(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.getRaiseRequestById(id, userId, companyId);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'إلغاء طلب الزيادة' })
    async cancelRaiseRequest(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.cancelRaiseRequest(id, userId, companyId);
    }

    // ============ Manager Endpoints ============

    @Get('inbox/manager')
    @ApiOperation({ summary: 'صندوق وارد المدير' })
    @Roles(Role.MANAGER, Role.ADMIN)
    async getManagerInbox(
        @CurrentUser('id') managerId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.getManagerInbox(managerId, companyId);
    }

    @Post(':id/manager-decision')
    @ApiOperation({ summary: 'قرار المدير على طلب الزيادة' })
    @Roles(Role.MANAGER, Role.ADMIN)
    async managerDecision(
        @Param('id') id: string,
        @CurrentUser('id') managerId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() dto: ManagerDecisionDto,
    ) {
        return this.raisesService.managerDecision(id, companyId, managerId, dto);
    }

    // ============ HR Endpoints ============

    @Get('inbox/hr')
    @ApiOperation({ summary: 'صندوق وارد HR' })
    @Roles(Role.MANAGER, Role.ADMIN)
    async getHRInbox(
        @CurrentUser('id') hrUserId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.raisesService.getHRInbox(hrUserId, companyId);
    }

    @Post(':id/hr-decision')
    @ApiOperation({ summary: 'قرار HR على طلب الزيادة' })
    @Roles(Role.MANAGER, Role.ADMIN)
    async hrDecision(
        @Param('id') id: string,
        @CurrentUser('id') hrUserId: string,
        @CurrentUser('companyId') companyId: string,
        @Body() dto: HRDecisionDto,
    ) {
        return this.raisesService.hrDecision(id, companyId, hrUserId, dto);
    }

    // ============ Admin Endpoints ============

    @Get()
    @ApiOperation({ summary: 'جميع طلبات الزيادة' })
    @Roles(Role.ADMIN)
    async getAllRaiseRequests(
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: string,
    ) {
        return this.raisesService.getAllRaiseRequests(companyId, status as any);
    }
}
