import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    ParseUUIDPipe,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DisciplinaryService } from './disciplinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateCaseDto } from './dto/create-case.dto';
import { HRReviewDto } from './dto/hr-review.dto';
import { IssueDecisionDto } from './dto/issue-decision.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { ObjectionReviewDto } from './dto/objection-review.dto';

@Controller('disciplinary')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DisciplinaryController {
    constructor(private readonly disciplinaryService: DisciplinaryService) { }

    /**
     * إنشاء طلب تحقيق جديد (للمديرين)
     */
    @Post('cases')
    @RequirePermission('DISC_MANAGER_CREATE')
    async createCase(@Request() req: any, @Body() dto: CreateCaseDto) {
        return this.disciplinaryService.createCase(req.user.id, req.user.companyId, dto);
    }

    /**
     * جلب قائمة القضايا حسب الدور
     */
    @Get('cases')
    async getCases(
        @Request() req: any,
        @Query('role') role: 'manager' | 'hr' | 'employee' = 'hr'
    ) {
        return this.disciplinaryService.getCasesForRole(req.user.id, req.user.companyId, role);
    }

    /**
     * جلب تفاصيل القضية
     */
    @Get('cases/:id')
    async getCaseDetail(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        return this.disciplinaryService.getCaseDetail(id, req.user.companyId);
    }

    /**
     * مراجعة أولية للطلب (للـ HR)
     */
    @Post('cases/:id/hr-review')
    @RequirePermission('DISC_HR_REVIEW')
    async hrInitialReview(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: HRReviewDto
    ) {
        return this.disciplinaryService.hrInitialReview(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * رد الموظف على الإجراء غير الرسمي
     */
    @Post('cases/:id/employee-informal-response')
    @RequirePermission('DISC_EMPLOYEE_RESPONSE')
    async employeeInformalResponse(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: EmployeeResponseDto
    ) {
        return this.disciplinaryService.employeeInformalResponse(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * إصدار قرار التحقيق (للـ HR)
     */
    @Post('cases/:id/decision')
    @RequirePermission('DISC_HR_DECISION')
    async issueDecision(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: IssueDecisionDto
    ) {
        return this.disciplinaryService.issueDecision(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * الاعتماد النهائي للقضية
     */
    @Post('cases/:id/finalize')
    @RequirePermission('DISC_HR_FINALIZE')
    async finalizeCase(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any
    ) {
        return this.disciplinaryService.finalizeCase(id, req.user.id, req.user.companyId);
    }

    /**
     * مراجعة الاعتراض من قبل الموارد البشرية
     */
    @Post('cases/:id/objection-review')
    @RequirePermission('DISC_HR_DECISION')
    async objectionReview(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: ObjectionReviewDto
    ) {
        return this.disciplinaryService.objectionReview(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * تحديد موعد جلسة التحقيق

     */
    @Post('cases/:id/schedule-hearing')
    @RequirePermission('DISC_HR_REVIEW')
    async scheduleHearing(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: { hearingDatetime: string; hearingLocation: string }
    ) {
        return this.disciplinaryService.scheduleHearing(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * رفع محضر جلسة
     */
    @Post('cases/:id/minutes')
    @RequirePermission('DISC_HR_REVIEW')
    async uploadMinutes(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: { sessionNo: number; minutesText?: string; minutesFileUrl?: string }
    ) {
        return this.disciplinaryService.uploadMinutes(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * رد الموظف على القرار النهائي
     */
    @Post('cases/:id/employee-decision-response')
    @RequirePermission('DISC_EMPLOYEE_RESPONSE')
    async employeeDecisionResponse(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: { action: 'ACCEPT' | 'OBJECT'; objectionText?: string }
    ) {
        return this.disciplinaryService.employeeDecisionResponse(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * رفع مرفقات (JSON - URL مباشر)
     */
    @Post('cases/:id/attachments')
    async uploadAttachment(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() dto: { fileUrl: string; fileName: string; fileType: string }
    ) {
        return this.disciplinaryService.uploadAttachment(id, req.user.id, req.user.companyId, dto);
    }

    /**
     * رفع ملفات مرفقة (Multipart)
     */
    @Post('cases/:id/upload-files')
    @UseInterceptors(FilesInterceptor('files', 10))
    async uploadFiles(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        return this.disciplinaryService.uploadFiles(id, req.user.id, req.user.companyId, files);
    }

    /**
     * تبديل حالة الحجز القانوني
     */
    @Post('cases/:id/toggle-hold')
    @RequirePermission('DISC_HR_DECISION')
    async toggleLegalHold(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body('hold') hold: boolean
    ) {
        return this.disciplinaryService.toggleLegalHold(id, req.user.id, req.user.companyId, hold);
    }
}

