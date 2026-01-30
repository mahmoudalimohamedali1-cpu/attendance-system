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
import { LettersService } from './letters.service';
import { CreateLetterRequestDto } from './dto/create-letter-request.dto';
import { LetterQueryDto } from './dto/letter-query.dto';
import { ApproveLetterDto } from './dto/approve-letter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../../common/upload/upload.service';

@ApiTags('letters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('letters')
export class LettersController {
  constructor(
    private readonly lettersService: LettersService,
    private readonly uploadService: UploadService,
  ) { }

  // ============ Static Routes FIRST (before :id params) ============

  @Post('upload-attachments')
  @ApiOperation({ summary: 'رفع مرفقات طلب الخطاب' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'تم رفع الملفات بنجاح' })
  @UseInterceptors(FilesInterceptor('files', 5, {
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }))
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const uploadedFiles = await this.uploadService.uploadLetterAttachments(files);
    return {
      message: 'تم رفع الملفات بنجاح',
      files: uploadedFiles,
    };
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء طلب خطاب' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  async createLetterRequest(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() createLetterDto: CreateLetterRequestDto,
    @Req() req: Request,
  ) {
    const rawBody = req.body as any;
    if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
      createLetterDto.attachments = rawBody.attachments;
    }
    return this.lettersService.createLetterRequest(userId, companyId, createLetterDto);
  }

  @Get('my')
  @ApiOperation({ summary: 'طلبات الخطاب الخاصة بي' })
  @ApiResponse({ status: 200, description: 'قائمة طلبات الخطاب' })
  async getMyLetterRequests(
    @CurrentUser('id') userId: string,
    @Query() query: LetterQueryDto,
  ) {
    return this.lettersService.getMyLetterRequests(userId, query);
  }

  @Get('pending/all')
  @ApiOperation({ summary: 'الطلبات المعلقة (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة التي لديك صلاحية عليها' })
  async getPendingRequests(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query() query: LetterQueryDto,
  ) {
    return this.lettersService.getPendingRequests(userId, companyId, query);
  }

  @Get('inbox/manager')
  @ApiOperation({ summary: 'طلبات تنتظر موافقة المدير' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقتك كمدير' })
  async getManagerInbox(
    @CurrentUser('id') managerId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.lettersService.getManagerInbox(managerId, companyId);
  }

  @Get('inbox/hr')
  @ApiOperation({ summary: 'طلبات تنتظر موافقة HR' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات التي تنتظر موافقة HR' })
  async getHRInbox(
    @CurrentUser('id') hrUserId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.lettersService.getHRInbox(hrUserId, companyId);
  }

  // ============ Parameterized Routes LAST (after all static routes) ============

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب خطاب' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  async getLetterRequestById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.lettersService.getLetterRequestById(id, userId, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'إلغاء طلب خطاب' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء بنجاح' })
  async cancelLetterRequest(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.lettersService.cancelLetterRequest(id, userId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'الموافقة على طلب خطاب (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveLetterRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { notes?: string; attachments?: any[] },
  ) {
    return this.lettersService.approveLetterRequest(id, approverId, companyId, body.notes, body.attachments);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'رفض طلب خطاب (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'تم الرفض' })
  async rejectLetterRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { notes?: string; attachments?: any[] },
  ) {
    return this.lettersService.rejectLetterRequest(id, approverId, companyId, body.notes, body.attachments);
  }

  @Post(':id/manager-decision')
  @ApiOperation({ summary: 'قرار المدير على طلب الخطاب (موافقة/رفض)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل قرار المدير' })
  async managerDecision(
    @Param('id') id: string,
    @CurrentUser('id') managerId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; notes?: string; attachments?: any[] },
  ) {
    return this.lettersService.managerDecision(id, managerId, companyId, body.decision, body.notes, body.attachments);
  }

  @Post(':id/hr-decision')
  @ApiOperation({ summary: 'قرار HR على طلب الخطاب (موافقة/رفض/تأجيل)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل قرار HR' })
  async hrDecision(
    @Param('id') id: string,
    @CurrentUser('id') hrUserId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string; attachments?: any[] },
  ) {
    return this.lettersService.hrDecision(id, hrUserId, companyId, body.decision, body.notes, body.attachments);
  }
}
