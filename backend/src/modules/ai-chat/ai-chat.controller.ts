import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    UseGuards,
    Request,
    Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecureAiChatService } from './secure-ai-chat.service';
import { RateLimiterGuard } from './security';

/**
 * 🤖 AI Chat Controller (Secure Version)
 * 
 * FIXES APPLIED:
 * - #11: Rate limiting via RateLimiterGuard
 * - #10: Early authentication via JwtAuthGuard
 * - Proper error handling and logging
 */

@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class AiChatController {
    private readonly logger = new Logger(AiChatController.name);

    constructor(private readonly chatService: SecureAiChatService) { }

    /**
     * 💬 Send message to AI
     */
    @Post('message')
    @UseGuards(RateLimiterGuard)
    async sendMessage(
        @Body('message') message: string,
        @Request() req: any
    ) {
        const userId = req.user?.id;

        if (!userId) {
            return {
                success: false,
                response: 'يجب تسجيل الدخول أولاً',
            };
        }

        if (!message || message.trim().length === 0) {
            return {
                success: false,
                response: 'الرسالة مطلوبة',
            };
        }

        try {
            const result = await this.chatService.chat(userId, message);

            return {
                success: true,
                ...result,
            };
        } catch (error: any) {
            this.logger.error(`Chat error: ${error.message}`);
            return {
                success: false,
                response: 'حدث خطأ في معالجة الطلب',
            };
        }
    }

    /**
     * 📜 Get chat history
     */
    @Get('history')
    async getHistory(@Request() req: any) {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
            return { success: false, history: [] };
        }

        try {
            const history = await this.chatService.getHistory(userId, companyId);
            return {
                success: true,
                history: history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                })),
            };
        } catch (error: any) {
            this.logger.error(`History error: ${error.message}`);
            return { success: false, history: [] };
        }
    }

    /**
     * 🗑️ Clear chat history
     */
    @Delete('history')
    async clearHistory(@Request() req: any) {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
            return { success: false };
        }

        try {
            await this.chatService.clearHistory(userId, companyId);
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Clear history error: ${error.message}`);
            return { success: false };
        }
    }

    /**
     * 💡 Get suggestions
     */
    @Get('suggestions')
    async getSuggestions(@Request() req: any) {
        const role = req.user?.role || 'EMPLOYEE';

        const baseSuggestions = [
            'رصيد إجازاتي',
            'حضوري اليوم',
            'طلب إجازة',
        ];

        const adminSuggestions = [
            'حالة النظام',
            'تقرير الحضور',
            'deploy',
            'الموظفين المتأخرين',
        ];

        const hrSuggestions = [
            'تقرير الحضور',
            'طلبات الإجازات المعلقة',
            'عرض الموظفين',
        ];

        if (['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return { suggestions: [...adminSuggestions, ...baseSuggestions] };
        }

        if (role === 'HR') {
            return { suggestions: [...hrSuggestions, ...baseSuggestions] };
        }

        return { suggestions: baseSuggestions };
    }
}
