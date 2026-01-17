import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseUUIDPipe,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmployeeProfileService } from './employee-profile.service';
import {
    UpdateProfileDto,
    RequestOnBehalfDto,
    UploadDocumentDto,
    AttendanceQueryDto,
    CreateEmergencyContactDto,
    UpdateEmergencyContactDto,
} from './dto/profile.dto';

@Controller('employee-profile')
@UseGuards(JwtAuthGuard)
export class EmployeeProfileController {
    constructor(private readonly profileService: EmployeeProfileService) { }

    /**
     * GET /employee-profile/:id
     * جلب البروفايل الكامل للموظف
     */
    @Get(':id')
    async getFullProfile(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getFullProfile(userId, user.companyId, user.id);
    }

    /**
     * PATCH /employee-profile/:id
     * تحديث بيانات الموظف
     */
    @Patch(':id')
    async updateProfile(
        @Param('id', ParseUUIDPipe) userId: string,
        @Body() dto: UpdateProfileDto,
        @CurrentUser() user: any,
    ) {
        return this.profileService.updateProfile(
            userId,
            user.companyId,
            user.id,
            dto,
        );
    }

    /**
     * GET /employee-profile/:id/overview
     * جلب ملخص البروفايل
     */
    @Get(':id/overview')
    async getOverview(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getOverview(userId, user.companyId);
    }

    /**
     * GET /employee-profile/:id/attendance
     * إحصائيات الحضور
     */
    @Get(':id/attendance')
    async getAttendanceStats(
        @Param('id', ParseUUIDPipe) userId: string,
        @Query() query: AttendanceQueryDto,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getAttendanceStats(
            userId,
            user.companyId,
            query.startDate,
            query.endDate,
        );
    }

    /**
     * GET /employee-profile/:id/leaves
     * سجل الإجازات والأرصدة
     */
    @Get(':id/leaves')
    async getLeaveHistory(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getLeaveHistory(userId, user.companyId);
    }

    /**
     * GET /employee-profile/:id/salary
     * بيانات الراتب
     */
    @Get(':id/salary')
    async getSalaryInfo(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getSalaryInfo(userId, user.companyId);
    }

    /**
     * GET /employee-profile/:id/documents
     * جلب الوثائق
     */
    @Get(':id/documents')
    async getDocuments(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getDocuments(userId, user.companyId);
    }

    /**
     * GET /employee-profile/:id/timeline
     * سجل النشاطات
     */
    @Get(':id/timeline')
    async getActivityTimeline(
        @Param('id', ParseUUIDPipe) userId: string,
        @Query('limit') limit: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getActivityTimeline(
            userId,
            user.companyId,
            limit ? parseInt(limit, 10) : 20,
        );
    }

    /**
     * POST /employee-profile/:id/documents
     * رفع مستند جديد
     */
    @Post(':id/documents')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @Param('id', ParseUUIDPipe) userId: string,
        @Body() dto: UploadDocumentDto,
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        if (!file) {
            throw new Error('الملف مطلوب');
        }

        // حفظ الملف في مسار uploads
        const filePath = `/uploads/documents/${Date.now()}-${file.originalname}`;
        // TODO: استخدام UploadService لحفظ الملف فعلياً

        return this.profileService.uploadDocument(
            userId,
            user.companyId,
            user.id,
            {
                type: dto.type,
                title: dto.title,
                titleAr: dto.titleAr,
                description: dto.description,
                documentNumber: dto.documentNumber,
                issueDate: dto.issueDate,
                expiryDate: dto.expiryDate,
                issuingAuthority: dto.issuingAuthority,
                notes: dto.notes,
                filePath,
                fileType: file.mimetype,
                fileSize: file.size,
                originalName: file.originalname,
            },
        );
    }

    /**
     * POST /employee-profile/:id/request-on-behalf
     * إنشاء طلب بالنيابة
     */
    @Post(':id/request-on-behalf')
    async createRequestOnBehalf(
        @Param('id', ParseUUIDPipe) userId: string,
        @Body() dto: RequestOnBehalfDto,
        @CurrentUser() user: any,
    ) {
        return this.profileService.createRequestOnBehalf(
            userId,
            user.companyId,
            user.id,
            dto,
        );
    }

    /**
     * DELETE /employee-profile/:id/documents/:docId
     * حذف مستند
     */
    @Delete(':id/documents/:docId')
    async deleteDocument(
        @Param('id', ParseUUIDPipe) userId: string,
        @Param('docId', ParseUUIDPipe) docId: string,
        @CurrentUser() user: any,
    ) {
        // التحقق من أن المستند ينتمي للموظف والشركة
        return this.profileService.deleteDocument(userId, docId, user.companyId, user.id);
    }

    // ============ Emergency Contacts Endpoints ============

    /**
     * GET /employee-profile/:id/emergency-contacts
     * جلب جهات الاتصال الطارئة للموظف
     */
    @Get(':id/emergency-contacts')
    async getEmergencyContacts(
        @Param('id', ParseUUIDPipe) userId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.getEmergencyContacts(userId, user.companyId, user.id);
    }

    /**
     * POST /employee-profile/:id/emergency-contacts
     * إضافة جهة اتصال طارئة جديدة
     */
    @Post(':id/emergency-contacts')
    async createEmergencyContact(
        @Param('id', ParseUUIDPipe) userId: string,
        @Body() dto: CreateEmergencyContactDto,
        @CurrentUser() user: any,
    ) {
        return this.profileService.createEmergencyContact(
            userId,
            user.companyId,
            user.id,
            dto,
        );
    }

    /**
     * PATCH /employee-profile/:id/emergency-contacts/:contactId
     * تحديث جهة اتصال طارئة
     */
    @Patch(':id/emergency-contacts/:contactId')
    async updateEmergencyContact(
        @Param('id', ParseUUIDPipe) userId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Body() dto: UpdateEmergencyContactDto,
        @CurrentUser() user: any,
    ) {
        return this.profileService.updateEmergencyContact(
            userId,
            contactId,
            user.companyId,
            user.id,
            dto,
        );
    }

    /**
     * DELETE /employee-profile/:id/emergency-contacts/:contactId
     * حذف جهة اتصال طارئة
     */
    @Delete(':id/emergency-contacts/:contactId')
    async deleteEmergencyContact(
        @Param('id', ParseUUIDPipe) userId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @CurrentUser() user: any,
    ) {
        return this.profileService.deleteEmergencyContact(
            userId,
            contactId,
            user.companyId,
            user.id,
        );
    }
}
