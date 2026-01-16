import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import {
    OptimizeScheduleRequestDto,
    OptimizeScheduleResponseDto,
    ScheduleShift,
    ScheduleOptimizationResult,
} from '../dto/schedule-optimization.dto';

interface EmployeeInfo {
    id: string;
    name: string;
    department: string;
    basicSalary: number;
    weeklyHours: number;
}

interface AIScheduleResponse {
    shifts: Array<{
        date: string;
        userId: string;
        employeeName: string;
        startTime: string;
        endTime: string;
        hours: number;
        department?: string;
    }>;
    result: {
        totalShifts: number;
        totalHours: number;
        estimatedCost: number;
        coverageRate: number;
        optimizationScore: number;
    };
    recommendations: string[];
}

@Injectable()
export class ScheduleOptimizerService {
    private readonly logger = new Logger(ScheduleOptimizerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) {}

    /**
     * Optimize schedule using AI and historical data
     */
    async optimizeSchedule(
        companyId: string,
        requestDto: OptimizeScheduleRequestDto,
    ): Promise<OptimizeScheduleResponseDto> {
        this.logger.debug(
            `Optimizing schedule for company ${companyId} from ${requestDto.startDate} to ${requestDto.endDate}`,
        );

        try {
            // Get employee data
            const employees = await this.getEmployeeData(
                companyId,
                requestDto.branchId,
                requestDto.departmentId,
            );

            if (employees.length === 0) {
                throw new Error('No employees found for scheduling');
            }

            // Get historical patterns
            const historicalPatterns = await this.getHistoricalPatterns(
                companyId,
                requestDto.branchId,
                requestDto.departmentId,
            );

            // Use AI to optimize schedule
            const aiResponse = await this.generateAISchedule(
                employees,
                historicalPatterns,
                requestDto,
            );

            return {
                companyId,
                startDate: requestDto.startDate,
                endDate: requestDto.endDate,
                shifts: aiResponse.shifts,
                result: aiResponse.result,
                recommendations: aiResponse.recommendations,
                generatedAt: new Date(),
            };
        } catch (error) {
            this.logger.error(`Failed to optimize schedule: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get employee data for scheduling
     */
    private async getEmployeeData(
        companyId: string,
        branchId?: string,
        departmentId?: string,
    ): Promise<EmployeeInfo[]> {
        const whereClause: any = {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        if (departmentId) {
            whereClause.departmentId = departmentId;
        }

        const employees = await this.prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                basicSalary: true,
                department: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return employees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            department: emp.department?.name || 'غير محدد',
            basicSalary: Number(emp.basicSalary) || 0,
            weeklyHours: 40,
        }));
    }

    /**
     * Get historical attendance patterns
     */
    private async getHistoricalPatterns(
        companyId: string,
        branchId?: string,
        departmentId?: string,
    ): Promise<any> {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const whereClause: any = {
            companyId,
            date: { gte: threeMonthsAgo },
        };

        if (branchId) {
            whereClause.user = { branchId };
        }

        if (departmentId) {
            whereClause.user = { ...whereClause.user, departmentId };
        }

        const attendanceByDay = await this.prisma.attendance.groupBy({
            by: ['date'],
            where: whereClause,
            _count: {
                id: true,
            },
            orderBy: {
                date: 'desc',
            },
            take: 90,
        });

        const dayOfWeekPatterns = new Map<number, number[]>();

        attendanceByDay.forEach((record) => {
            const dayOfWeek = record.date.getDay();
            if (!dayOfWeekPatterns.has(dayOfWeek)) {
                dayOfWeekPatterns.set(dayOfWeek, []);
            }
            dayOfWeekPatterns.get(dayOfWeek)!.push(record._count.id);
        });

        const averageByDay: { [key: number]: number } = {};
        dayOfWeekPatterns.forEach((counts, day) => {
            averageByDay[day] = counts.reduce((a, b) => a + b, 0) / counts.length;
        });

        return {
            averageByDay,
            totalRecords: attendanceByDay.length,
        };
    }

    /**
     * Generate AI-optimized schedule
     */
    private async generateAISchedule(
        employees: EmployeeInfo[],
        historicalPatterns: any,
        requestDto: OptimizeScheduleRequestDto,
    ): Promise<AIScheduleResponse> {
        if (!this.aiService.isAvailable()) {
            this.logger.warn('AI service not available, using fallback scheduling');
            return this.generateFallbackSchedule(employees, requestDto);
        }

        const prompt = this.buildSchedulePrompt(employees, historicalPatterns, requestDto);
        const systemInstruction = `أنت خبير تحسين جداول العمل. قم بإنشاء جداول عمل محسّنة تزيد الإنتاجية وتقلل التكاليف مع احترام قيود العمل.
استجب بتنسيق JSON فقط دون أي نص إضافي.`;

        try {
            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            return this.aiService.parseJsonResponse<AIScheduleResponse>(aiResponse);
        } catch (error) {
            this.logger.error(`AI schedule optimization failed: ${error.message}`);
            return this.generateFallbackSchedule(employees, requestDto);
        }
    }

    /**
     * Build prompt for AI schedule optimization
     */
    private buildSchedulePrompt(
        employees: EmployeeInfo[],
        historicalPatterns: any,
        requestDto: OptimizeScheduleRequestDto,
    ): string {
        const constraints = requestDto.constraints || {};
        const minStaff = constraints.minStaff || Math.ceil(employees.length * 0.6);
        const maxWeeklyHours = constraints.maxWeeklyHours || 48;
        const minRestHours = constraints.minRestHours || 12;
        const weekendDays = constraints.weekendDays || [5, 6];

        return `
قم بتحسين جدول العمل التالي مع مراعاة القيود والأنماط التاريخية:

**الموظفون المتاحون:**
${employees.slice(0, 10).map((e) => `- ${e.name} (${e.department}) - راتب: ${e.basicSalary.toFixed(2)} ريال`).join('\n')}
${employees.length > 10 ? `... و ${employees.length - 10} موظف آخر` : ''}

**الأنماط التاريخية:**
${Object.entries(historicalPatterns.averageByDay || {})
    .map(([day, avg]) => `- ${this.getDayName(parseInt(day))}: متوسط ${Math.round(avg as number)} موظف`)
    .join('\n')}

**فترة الجدولة:**
- من: ${requestDto.startDate}
- إلى: ${requestDto.endDate}

**القيود:**
- الحد الأدنى للموظفين: ${minStaff}
- الحد الأقصى للموظفين: ${constraints.maxStaff || employees.length}
- الحد الأقصى لساعات العمل الأسبوعية: ${maxWeeklyHours} ساعة
- الحد الأدنى لساعات الراحة: ${minRestHours} ساعة
- أيام الإجازة الأسبوعية: ${weekendDays.map((d) => this.getDayName(d)).join(', ')}

قم بإنشاء جدول عمل محسّن يحقق:
1. توزيع عادل للمناوبات بين الموظفين
2. تغطية احتياجات العمل اليومية
3. احترام قيود ساعات العمل وأوقات الراحة
4. تقليل التكاليف من خلال الجدولة الذكية
5. تقديم توصيات لتحسين الجدولة

استخدم التنسيق التالي:
{
    "shifts": [
        {
            "date": "YYYY-MM-DD",
            "userId": "string",
            "employeeName": "string",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "hours": number,
            "department": "string"
        }
    ],
    "result": {
        "totalShifts": number,
        "totalHours": number,
        "estimatedCost": number,
        "coverageRate": number,
        "optimizationScore": 0.0-1.0
    },
    "recommendations": ["string"]
}
`;
    }

    /**
     * Fallback schedule when AI is not available
     */
    private generateFallbackSchedule(
        employees: EmployeeInfo[],
        requestDto: OptimizeScheduleRequestDto,
    ): AIScheduleResponse {
        const shifts: ScheduleShift[] = [];
        const startDate = new Date(requestDto.startDate);
        const endDate = new Date(requestDto.endDate);

        let employeeIndex = 0;
        let totalHours = 0;
        let totalCost = 0;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

            if (isWeekend) {
                continue;
            }

            const dailyStaffNeeded = Math.ceil(employees.length * 0.6);

            for (let i = 0; i < dailyStaffNeeded; i++) {
                const employee = employees[employeeIndex % employees.length];
                const hours = 8;

                shifts.push({
                    date: d.toISOString().split('T')[0],
                    userId: employee.id,
                    employeeName: employee.name,
                    startTime: '09:00',
                    endTime: '17:00',
                    hours,
                    department: employee.department,
                });

                totalHours += hours;
                totalCost += (employee.basicSalary / 176) * hours;
                employeeIndex++;
            }
        }

        return {
            shifts,
            result: {
                totalShifts: shifts.length,
                totalHours,
                estimatedCost: totalCost,
                coverageRate: 95,
                optimizationScore: 0.7,
            },
            recommendations: [
                'الجدول تم إنشاؤه بشكل أساسي - استخدم الذكاء الاصطناعي للحصول على نتائج أفضل',
                'قم بمراجعة توزيع المناوبات لضمان العدالة',
                'راقب معدل الحضور الفعلي وقارنه بالتوقعات',
            ],
        };
    }

    /**
     * Get day name in Arabic
     */
    private getDayName(day: number): string {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[day] || 'غير معروف';
    }
}
