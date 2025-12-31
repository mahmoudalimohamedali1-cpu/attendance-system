import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartPoliciesService, CreateSmartPolicyDto, UpdateSmartPolicyDto } from './smart-policies.service';
import { SmartPolicyStatus, SmartPolicyTrigger } from '@prisma/client';

@ApiTags('السياسات الذكية')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('smart-policies')
export class SmartPoliciesController {
    constructor(private readonly service: SmartPoliciesService) { }

    /**
     * تحليل نص السياسة بالذكاء الاصطناعي (معاينة فقط)
     */
    @Post('analyze')
    @ApiOperation({ summary: 'تحليل نص السياسة بالذكاء الاصطناعي - معاينة فقط' })
    async analyze(@Body() body: { text: string }) {
        const parsedRule = await this.service.analyzePolicy(body.text);
        return { success: true, parsedRule };
    }

    /**
     * إنشاء سياسة ذكية جديدة
     */
    @Post()
    @ApiOperation({ summary: 'إنشاء سياسة ذكية جديدة من نص طبيعي' })
    async create(
        @Body() dto: CreateSmartPolicyDto,
        @CurrentUser() user: any,
    ) {
        const policy = await this.service.create(user.companyId, dto, user.id);
        return { success: true, data: policy };
    }

    /**
     * الحصول على جميع السياسات الذكية
     */
    @Get()
    @ApiOperation({ summary: 'قائمة السياسات الذكية' })
    @ApiQuery({ name: 'status', required: false, enum: SmartPolicyStatus })
    @ApiQuery({ name: 'triggerEvent', required: false, enum: SmartPolicyTrigger })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: SmartPolicyStatus,
        @Query('triggerEvent') triggerEvent?: SmartPolicyTrigger,
        @Query('isActive') isActive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return await this.service.findAll(user.companyId, {
            status,
            triggerEvent,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    /**
     * الحصول على سياسة ذكية بالمعرف
     */
    @Get(':id')
    @ApiOperation({ summary: 'تفاصيل سياسة ذكية' })
    async findOne(@Param('id') id: string) {
        const policy = await this.service.findOne(id);
        return { success: true, data: policy };
    }

    /**
     * تحديث سياسة ذكية
     */
    @Patch(':id')
    @ApiOperation({ summary: 'تحديث سياسة ذكية' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateSmartPolicyDto,
        @CurrentUser() user: any,
    ) {
        const policy = await this.service.update(id, dto, user.id);
        return { success: true, data: policy };
    }

    /**
     * حذف سياسة ذكية
     */
    @Delete(':id')
    @ApiOperation({ summary: 'حذف سياسة ذكية' })
    async delete(@Param('id') id: string) {
        await this.service.delete(id);
        return { success: true, message: 'تم حذف السياسة بنجاح' };
    }

    /**
     * تفعيل سياسة ذكية
     */
    @Post(':id/activate')
    @ApiOperation({ summary: 'تفعيل سياسة ذكية' })
    async activate(@Param('id') id: string, @CurrentUser() user: any) {
        const policy = await this.service.toggleActive(id, true, user.id);
        return { success: true, data: policy, message: 'تم تفعيل السياسة' };
    }

    /**
     * إيقاف سياسة ذكية
     */
    @Post(':id/deactivate')
    @ApiOperation({ summary: 'إيقاف سياسة ذكية' })
    async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
        const policy = await this.service.toggleActive(id, false, user.id);
        return { success: true, data: policy, message: 'تم إيقاف السياسة' };
    }

    /**
     * الحصول على إحصائيات السياسات
     */
    @Get('stats/overview')
    @ApiOperation({ summary: 'إحصائيات السياسات الذكية' })
    async getStats(@CurrentUser() user: any) {
        const [total, active, draft, paused] = await Promise.all([
            this.service.findAll(user.companyId, { limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.ACTIVE, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.DRAFT, limit: 1 }).then(r => r.pagination.total),
            this.service.findAll(user.companyId, { status: SmartPolicyStatus.PAUSED, limit: 1 }).then(r => r.pagination.total),
        ]);

        return {
            success: true,
            data: {
                total,
                active,
                draft,
                paused,
            },
        };
    }
}
