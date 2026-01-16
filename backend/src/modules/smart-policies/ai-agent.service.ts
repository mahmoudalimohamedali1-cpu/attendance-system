import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/**
 * 🔥 AI Agent Service
 * يقرأ النظام ويكتب queries تلقائياً
 * لديه صلاحية كاملة للـ database
 */
@Injectable()
export class AiAgentService {
    private readonly logger = new Logger(AiAgentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    /**
     * 🔥 تنفيذ سياسة ذكية
     * الـ AI يكتب الـ query ويتنفذ مباشرة
     */
    async executeSmartPolicy(
        policyText: string,
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{ success: boolean; result: any; query: string }> {

        // 1. الحصول على الـ schema
        const schema = await this.getDatabaseSchema();

        // 2. طلب من الـ AI كتابة الـ query
        const queryPrompt = `
أنت AI Agent لديك صلاحية كاملة على Database.

📊 الجداول المتاحة:
${schema}

📝 السياسة المطلوبة:
"${policyText}"

🎯 المطلوب:
اكتب Prisma query لفحص هل الموظف (userId: "${employeeId}") يستوفي شروط السياسة.
الفترة: من ${startDate.toISOString()} إلى ${endDate.toISOString()}

أرجع JSON فقط بهذا الشكل:
{
  "table": "اسم الجدول",
  "operation": "findFirst أو count أو aggregate",
  "where": { ... شروط الـ query ... },
  "conditionMet": "شرح متى تتحقق السياسة"
}
`;

        try {
            const response = await this.aiService.generateContent(queryPrompt,
                'أنت AI Agent متخصص في كتابة Prisma queries. أرجع JSON فقط بدون أي نص إضافي.');

            const querySpec = this.aiService.parseJsonResponse<{
                table: string;
                operation: string;
                where: any;
                conditionMet: string;
            }>(response);

            this.logger.log(`AI generated query for table: ${querySpec.table}`);

            // 3. تنفيذ الـ query
            const result = await this.executeQuery(querySpec, employeeId, startDate, endDate);

            return {
                success: true,
                result,
                query: JSON.stringify(querySpec, null, 2)
            };

        } catch (error) {
            this.logger.error(`AI Agent error: ${error.message}`);
            return {
                success: false,
                result: null,
                query: error.message
            };
        }
    }

    /**
     * تنفيذ الـ query المُولّد من الـ AI
     */
    private async executeQuery(
        querySpec: { table: string; operation: string; where: any },
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const tableName = querySpec.table.toLowerCase();
        const model = (this.prisma as any)[tableName];

        if (!model) {
            throw new Error(`Table ${tableName} not found`);
        }

        // إضافة userId للـ query
        const where = {
            ...querySpec.where,
            userId: employeeId,
        };

        // إضافة فلتر التاريخ إذا الجدول يدعمه
        if (querySpec.where?.date === undefined) {
            where.date = { gte: startDate, lte: endDate };
        }

        switch (querySpec.operation) {
            case 'findFirst':
                return await model.findFirst({ where });
            case 'findMany':
                return await model.findMany({ where });
            case 'count':
                return await model.count({ where });
            case 'aggregate':
                return await model.aggregate({ where, _sum: { amount: true } });
            default:
                return await model.findFirst({ where });
        }
    }

    /**
     * الحصول على schema الـ Database
     */
    private async getDatabaseSchema(): Promise<string> {
        return `
الجداول الرئيسية:

📋 Attendance (الحضور):
  - userId: معرف الموظف
  - date: تاريخ اليوم (DateTime)
  - checkIn: وقت الحضور (DateTime)
  - checkOut: وقت الانصراف (DateTime)
  - status: PRESENT, ABSENT, LATE, EARLY_LEAVE
  - workingHours: ساعات العمل (Decimal)
  - lateMinutes: دقائق التأخير (Int)
  - overtimeHours: ساعات إضافية (Decimal)

📋 LeaveRequest (الإجازات):
  - userId: معرف الموظف
  - type: ANNUAL, SICK, UNPAID
  - startDate, endDate: فترة الإجازة
  - totalDays: عدد الأيام
  - status: PENDING, APPROVED, REJECTED

📋 Contract (العقود):
  - userId: معرف الموظف
  - basicSalary: الراتب الأساسي
  - startDate: بداية العقد
  - probationEndDate: نهاية التجربة

📋 DisciplinaryCase (المخالفات):
  - userId: معرف الموظف
  - type: نوع المخالفة
  - status: حالة المخالفة
  - penaltyAmount: مبلغ الغرامة

📋 AdvanceRequest (السلف):
  - userId: معرف الموظف
  - amount: مبلغ السلفة
  - remainingAmount: المتبقي
  - status: الحالة

📋 CustodyItem (العهد):
  - userId: معرف الموظف
  - status: حالة العهدة
  - value: القيمة

📋 Task (المهام):
  - assigneeId: معرف الموظف
  - status: حالة المهمة
  - dueDate: تاريخ الاستحقاق
`;
    }

    /**
     * 🔥 إضافة حقل جديد للنظام
     * الـ AI يقدر يضيف custom fields
     */
    async addCustomField(
        fieldName: string,
        fieldType: string,
        description: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // إضافة الحقل لجدول CustomFieldDefinition
            await (this.prisma as any).customFieldDefinition.create({
                data: {
                    name: fieldName,
                    type: fieldType,
                    description: description,
                    isActive: true,
                }
            });

            this.logger.log(`AI added custom field: ${fieldName}`);
            return { success: true, message: `تم إضافة الحقل: ${fieldName}` };
        } catch (error) {
            this.logger.error(`Failed to add custom field: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
}
