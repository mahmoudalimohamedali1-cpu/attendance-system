import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AiHrService } from './ai-hr.service';

@ApiTags('AI HR - أتمتة الموارد البشرية')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-hr')
export class AiHrController {
    constructor(private readonly hrService: AiHrService) { }

    /**
     * 📝 توليد خطاب ذكي
     */
    @Post('generate-letter')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'توليد خطاب ذكي' })
    async generateLetter(@Body() body: {
        userId: string;
        letterType: 'experience' | 'salary' | 'employment' | 'recommendation';
        customDetails?: string;
    }) {
        const letter = await this.hrService.generateSmartLetter(
            body.userId,
            body.letterType,
            body.customDetails
        );
        return { success: true, letter };
    }

    /**
     * 📖 شرح السياسات
     */
    @Post('explain-policy')
    @ApiOperation({ summary: 'شرح سياسة معينة' })
    async explainPolicy(@Request() req: any, @Body() body: { question: string }) {
        const explanation = await this.hrService.explainPolicy(body.question, req.user.role);
        return { success: true, explanation };
    }

    /**
     * 🏛️ فحص امتثال التأمينات
     */
    @Get('gosi-compliance')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'فحص امتثال التأمينات الاجتماعية' })
    async checkGosiCompliance(@Request() req: any) {
        const compliance = await this.hrService.checkGosiCompliance(req.user.companyId);
        return { success: true, data: compliance };
    }

    /**
     * 📊 تحليل احتياجات التوظيف
     */
    @Get('hiring-needs')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'تحليل احتياجات التوظيف' })
    async analyzeHiringNeeds(@Request() req: any) {
        const analysis = await this.hrService.analyzeHiringNeeds(req.user.companyId);
        return { success: true, data: analysis };
    }
}
