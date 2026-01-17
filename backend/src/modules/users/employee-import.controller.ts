// @ts-nocheck
import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Res,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmployeeImportService } from './services/employee-import.service';

@ApiTags('Employee Import')
@Controller('users/import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeeImportController {
    constructor(private importService: EmployeeImportService) { }

    @Get('template')
    @ApiOperation({ summary: 'تحميل قالب استيراد الموظفين' })
    downloadTemplate(@Res() res: Response) {
        const template = this.importService.generateTemplate();

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
        res.send('\uFEFF' + template); // BOM for Excel Arabic support
    }

    @Post('validate')
    @ApiOperation({ summary: 'التحقق من صحة ملف الاستيراد قبل التنفيذ' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async validateImport(
        @UploadedFile() file: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        if (!file) {
            throw new BadRequestException('لم يتم رفع أي ملف');
        }

        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);
        const validation = await this.importService.validateImport(rows, companyId);

        return {
            fileName: file.originalname,
            totalRows: rows.length,
            ...validation,
        };
    }

    @Post()
    @ApiOperation({ summary: 'استيراد الموظفين من ملف CSV' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async importEmployees(
        @UploadedFile() file: any,
        @CurrentUser('companyId') companyId: string,
    ) {
        if (!file) {
            throw new BadRequestException('لم يتم رفع أي ملف');
        }

        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);

        // First validate
        const validation = await this.importService.validateImport(rows, companyId);
        if (!validation.valid) {
            return {
                success: false,
                message: 'يوجد أخطاء في الملف',
                errors: validation.errors,
            };
        }

        // Then import
        const result = await this.importService.importEmployees(rows, companyId);

        return {
            ...result,
            message: result.success
                ? `تم استيراد ${result.created} موظف جديد وتحديث ${result.updated} موظف`
                : `تم الاستيراد مع بعض الأخطاء`,
        };
    }

    @Post('preview')
    @ApiOperation({ summary: 'معاينة أول 5 صفوف من الملف' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async previewImport(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('لم يتم رفع أي ملف');
        }

        const content = file.buffer.toString('utf-8');
        const rows = this.importService.parseCSV(content);

        return {
            fileName: file.originalname,
            totalRows: rows.length,
            headers: this.importService.getTemplateHeaders(),
            preview: rows.slice(0, 5),
        };
    }

    // ============================================
    // Endpoints الاستيراد الذكي (Smart Import)
    // ============================================

    @Post('smart-analyze')
    @ApiOperation({ summary: 'تحليل ذكي للملف مع اقتراح المطابقات' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async smartAnalyze(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('لم يتم رفع أي ملف');
        }

        const content = file.buffer.toString('utf-8');
        const analysis = this.importService.smartAnalyzeCSV(content);

        return {
            fileName: file.originalname,
            ...analysis,
        };
    }

    @Post('smart-import')
    @ApiOperation({ summary: 'استيراد ذكي مع مطابقة مخصصة' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                mappings: { type: 'string', description: 'JSON object of column mappings' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async smartImport(
        @UploadedFile() file: any,
        @Body('mappings') mappingsJson: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        if (!file) {
            throw new BadRequestException('لم يتم رفع أي ملف');
        }

        // Parse mappings
        let mappings: Record<string, string | null> = {};
        if (mappingsJson) {
            try {
                mappings = JSON.parse(mappingsJson);
            } catch {
                throw new BadRequestException('صيغة المطابقات غير صحيحة');
            }
        }

        const content = file.buffer.toString('utf-8');
        const result = await this.importService.smartImportEmployees(content, companyId, mappings);

        return {
            ...result,
            message: result.success
                ? `تم استيراد ${result.created} موظف جديد وتحديث ${result.updated} موظف وإضافة ${result.customFieldsAdded} حقل مخصص`
                : 'تم الاستيراد مع بعض الأخطاء',
        };
    }
}
