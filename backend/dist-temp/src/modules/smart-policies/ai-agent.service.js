"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiAgentService = AiAgentService_1 = class AiAgentService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiAgentService_1.name);
    }
    async executeSmartPolicy(policyText, employeeId, startDate, endDate) {
        const schema = await this.getDatabaseSchema();
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
            const response = await this.aiService.generateContent(queryPrompt, 'أنت AI Agent متخصص في كتابة Prisma queries. أرجع JSON فقط بدون أي نص إضافي.');
            const querySpec = this.aiService.parseJsonResponse(response);
            this.logger.log(`AI generated query for table: ${querySpec.table}`);
            const result = await this.executeQuery(querySpec, employeeId, startDate, endDate);
            return {
                success: true,
                result,
                query: JSON.stringify(querySpec, null, 2)
            };
        }
        catch (error) {
            this.logger.error(`AI Agent error: ${error.message}`);
            return {
                success: false,
                result: null,
                query: error.message
            };
        }
    }
    async executeQuery(querySpec, employeeId, startDate, endDate) {
        const tableName = querySpec.table.toLowerCase();
        const model = this.prisma[tableName];
        if (!model) {
            throw new Error(`Table ${tableName} not found`);
        }
        const where = {
            ...querySpec.where,
            userId: employeeId,
        };
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
    async getDatabaseSchema() {
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
    async addCustomField(fieldName, fieldType, description) {
        try {
            await this.prisma.customFieldDefinition.create({
                data: {
                    name: fieldName,
                    type: fieldType,
                    description: description,
                    isActive: true,
                }
            });
            this.logger.log(`AI added custom field: ${fieldName}`);
            return { success: true, message: `تم إضافة الحقل: ${fieldName}` };
        }
        catch (error) {
            this.logger.error(`Failed to add custom field: ${error.message}`);
            return { success: false, message: error.message };
        }
    }
};
exports.AiAgentService = AiAgentService;
exports.AiAgentService = AiAgentService = AiAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiAgentService);
//# sourceMappingURL=ai-agent.service.js.map