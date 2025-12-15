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
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadService } from '../../common/upload/upload.service';

@ApiTags('letters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('letters')
export class LettersController {
  constructor(
    private readonly lettersService: LettersService,
    private readonly uploadService: UploadService,
  ) {}

  // ============ Employee Endpoints ============

  @Post('upload-attachments')
  @ApiOperation({ summary: 'رفع مرفقات طلب الخطاب' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'تم رفع الملفات بنجاح' })
  @UseInterceptors(FilesInterceptor('files', 5))
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
  @ApiOperation({ summary: 'إنشاء طلب خطاب' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  async createLetterRequest(
    @CurrentUser('id') userId: string,
    @Body() createLetterDto: CreateLetterRequestDto,
    @Req() req: Request,
  ) {
    // استخدام attachments من raw body لتجنب مشكلة التحويل
    const rawBody = req.body as any;
    if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
      createLetterDto.attachments = rawBody.attachments;
    }
    return this.lettersService.createLetterRequest(userId, createLetterDto);
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

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب خطاب' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  async getLetterRequestById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.lettersService.getLetterRequestById(id, userId);
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

  // ============ Manager/Admin Endpoints ============

  @Get('pending/all')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الطلبات المعلقة' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة' })
  async getPendingRequests(
    @CurrentUser('id') userId: string,
    @Query() query: LetterQueryDto,
  ) {
    return this.lettersService.getPendingRequests(userId, query);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الموافقة على طلب خطاب' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveLetterRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLetterDto,
  ) {
    return this.lettersService.approveLetterRequest(id, approverId, approveDto.notes);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'رفض طلب خطاب' })
  @ApiResponse({ status: 200, description: 'تم الرفض' })
  async rejectLetterRequest(
    @Param('id') id: string,
    @CurrentUser('id') approverId: string,
    @Body() approveDto: ApproveLetterDto,
  ) {
    return this.lettersService.rejectLetterRequest(id, approverId, approveDto.notes);
  }
}

