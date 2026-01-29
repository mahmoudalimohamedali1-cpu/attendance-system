import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Request,
    UseGuards,
    Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeniusAiService } from './services/genius-ai.service';
import { GeniusContextService } from './services/genius-context.service';
import { DynamicQueryEngineService } from './services/dynamic-query-engine.service';

/**
 * 🧠 GENIUS AI Chat Controller
 * 
 * Advanced AI-powered HR assistant endpoints
 */

interface ChatRequestDto {
    message: string;
}

@ApiTags('AI Chat - Genius')
@Controller('genius-ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GeniusAiController {
    private readonly logger = new Logger(GeniusAiController.name);

    constructor(
        private readonly geniusAiService: GeniusAiService,
        private readonly contextService: GeniusContextService,
        private readonly dynamicQueryEngine: DynamicQueryEngineService
    ) { }

    /**
     * 💬 Send message to Genius AI
     */
    @Post('chat')
    @ApiOperation({ summary: 'إرسال رسالة للمساعد الذكي' })
    @ApiResponse({ status: 200, description: 'رد المساعد الذكي' })
    async chat(@Request() req: any, @Body() body: ChatRequestDto) {
        const userId = req.user.sub || req.user.id;
        this.logger.log(`[GENIUS] Chat request from user: ${userId}`);

        const response = await this.geniusAiService.chat(userId, body.message);

        return {
            success: true,
            ...response
        };
    }

    /**
     * 📊 Get system context summary
     */
    @Get('context')
    @ApiOperation({ summary: 'ملخص سياق النظام' })
    async getContext(@Request() req: any) {
        const companyId = req.user.companyId;
        const context = await this.contextService.getFullContext(companyId);

        return {
            success: true,
            context: {
                company: context.company,
                employees: {
                    total: context.employees.total,
                    active: context.employees.active,
                    atRisk: context.employees.atRisk.length
                },
                attendance: context.attendance.today,
                leaves: {
                    pending: context.leaves.pending,
                    upcomingCount: context.leaves.upcomingLeaves.length
                },
                alerts: {
                    critical: context.alerts.critical.length,
                    warnings: context.alerts.warnings.length
                }
            }
        };
    }

    /**
     * 🚨 Get alerts and insights
     */
    @Get('insights')
    @ApiOperation({ summary: 'التنبيهات والرؤى الذكية' })
    async getInsights(@Request() req: any) {
        const companyId = req.user.companyId;
        const context = await this.contextService.getFullContext(companyId);

        const insights = [];

        // Convert alerts to insights
        context.alerts.critical.forEach(alert => {
            insights.push({
                type: 'error',
                category: alert.type,
                title: alert.message,
                action: alert.action,
                priority: 1
            });
        });

        context.alerts.warnings.forEach(alert => {
            insights.push({
                type: 'warning',
                category: alert.type,
                title: alert.message,
                action: alert.action,
                priority: 2
            });
        });

        // Add proactive insights
        if (context.attendance.today.rate < 80) {
            insights.push({
                type: 'warning',
                category: 'attendance',
                title: `نسبة الحضور منخفضة: ${context.attendance.today.rate}%`,
                action: 'تحقق من الغائبين',
                priority: 2
            });
        }

        if (context.employees.atRisk.length > 0) {
            insights.push({
                type: 'info',
                category: 'retention',
                title: `${context.employees.atRisk.length} موظف في خطر دوران`,
                action: 'راجع تفاصيل الموظفين',
                priority: 3
            });
        }

        return {
            success: true,
            insights: insights.sort((a, b) => a.priority - b.priority),
            summary: {
                critical: context.alerts.critical.length,
                warnings: context.alerts.warnings.length,
                total: insights.length
            }
        };
    }

    /**
     * 💡 Get smart suggestions based on context
     */
    @Get('suggestions')
    @ApiOperation({ summary: 'اقتراحات ذكية' })
    async getSuggestions(@Request() req: any) {
        const userRole = req.user.role;

        const baseSuggestions = [
            { text: 'ملخص اليوم', icon: 'today', category: 'overview' },
            { text: 'تقرير الحضور', icon: 'schedule', category: 'attendance' },
            { text: 'اقتراحات ذكية', icon: 'lightbulb', category: 'insights' }
        ];

        const adminSuggestions = [
            { text: 'طلبات الإجازات المعلقة', icon: 'beach_access', category: 'leaves' },
            { text: 'الموظفين المتأخرين', icon: 'access_time', category: 'attendance' },
            { text: 'حلل الأداء', icon: 'analytics', category: 'analysis' },
            { text: 'توقع الدوران', icon: 'trending_up', category: 'analysis' },
            { text: 'إحصائيات الأقسام', icon: 'business', category: 'departments' }
        ];

        const employeeSuggestions = [
            { text: 'رصيد إجازاتي', icon: 'event', category: 'personal' },
            { text: 'حضوري هذا الشهر', icon: 'calendar_today', category: 'personal' },
            { text: 'مهامي', icon: 'task', category: 'personal' }
        ];

        const suggestions = [...baseSuggestions];

        if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(userRole)) {
            suggestions.push(...adminSuggestions);
        } else {
            suggestions.push(...employeeSuggestions);
        }

        return {
            success: true,
            suggestions
        };
    }

    /**
     * 📜 Get conversation history
     */
    @Get('history')
    @ApiOperation({ summary: 'سجل المحادثات' })
    async getHistory(@Request() req: any) {
        // The history is stored in memory - in production, this should be in database
        return {
            success: true,
            messages: [],
            note: 'History is session-based'
        };
    }

    /**
     * 🗑️ Clear conversation history
     */
    @Delete('history')
    @ApiOperation({ summary: 'مسح سجل المحادثات' })
    async clearHistory(@Request() req: any) {
        const userId = req.user.sub || req.user.id;
        this.geniusAiService.clearHistory(userId);

        return {
            success: true,
            message: 'تم مسح سجل المحادثات'
        };
    }

    /**
     * ⚡ Quick action endpoint
     */
    @Post('quick-action')
    @ApiOperation({ summary: 'تنفيذ إجراء سريع' })
    async quickAction(@Request() req: any, @Body() body: { action: string; params?: any }) {
        const userId = req.user.sub || req.user.id;

        // Map quick actions to chat commands
        const actionMap: Record<string, string> = {
            'today_summary': 'ملخص اليوم',
            'attendance_report': 'تقرير الحضور',
            'pending_leaves': 'طلبات الإجازات المعلقة',
            'late_employees': 'الموظفين المتأخرين اليوم',
            'insights': 'اقتراحات',
            'analyze_attendance': 'حلل الحضور',
            'analyze_turnover': 'حلل دوران الموظفين'
        };

        const message = actionMap[body.action] || body.action;
        const response = await this.geniusAiService.chat(userId, message);

        return {
            success: true,
            ...response
        };
    }

    /**
     * 📊 Get dashboard data for AI widget
     */
    @Get('dashboard')
    @ApiOperation({ summary: 'بيانات لوحة التحكم للـ AI' })
    async getDashboard(@Request() req: any) {
        const companyId = req.user.companyId;
        const context = await this.contextService.getFullContext(companyId);

        return {
            success: true,
            stats: [
                {
                    label: 'الموظفين النشطين',
                    value: context.employees.active,
                    icon: 'people',
                    color: 'primary'
                },
                {
                    label: 'نسبة الحضور',
                    value: `${context.attendance.today.rate}%`,
                    icon: 'schedule',
                    color: context.attendance.today.rate >= 80 ? 'success' : 'warning'
                },
                {
                    label: 'طلبات معلقة',
                    value: context.leaves.pending,
                    icon: 'pending',
                    color: context.leaves.pending > 5 ? 'error' : 'info'
                },
                {
                    label: 'تنبيهات',
                    value: context.alerts.critical.length + context.alerts.warnings.length,
                    icon: 'notification_important',
                    color: context.alerts.critical.length > 0 ? 'error' : 'success'
                }
            ],
            quickActions: [
                { id: 'today_summary', label: 'ملخص اليوم', icon: 'today' },
                { id: 'attendance_report', label: 'تقرير الحضور', icon: 'schedule' },
                { id: 'pending_leaves', label: 'طلبات الإجازات', icon: 'beach_access' },
                { id: 'insights', label: 'رؤى ذكية', icon: 'psychology' }
            ],
            recentActivity: context.recentActivity.slice(0, 5).map(a => ({
                type: a.type,
                description: a.description,
                time: a.timestamp
            }))
        };
    }

    /**
     * 🔍 @ Autocomplete - اقتراحات تلقائية عند كتابة @
     * 
     * Supported contexts:
     * - الموظف @ → list employees
     * - القسم @ → list departments
     * - الفرع @ → list branches
     * - المهمة @ → list tasks
     * - الهدف @ → list goals
     */
    @Post('autocomplete')
    @ApiOperation({ summary: 'اقتراحات تلقائية للـ @ mentions' })
    @ApiResponse({ status: 200, description: 'قائمة الاقتراحات' })
    async autocomplete(
        @Request() req: any,
        @Body() body: { context: string; searchTerm?: string; limit?: number }
    ) {
        const companyId = req.user.companyId;

        this.logger.log(`[GENIUS] Autocomplete: context="${body.context}", search="${body.searchTerm || ''}"`);

        const result = await this.dynamicQueryEngine.getAutocomplete(
            body.context,
            body.searchTerm || '',
            companyId,
            body.limit || 10
        );

        return {
            success: true,
            ...result
        };
    }
}
