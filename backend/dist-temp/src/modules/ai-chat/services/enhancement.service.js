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
var EnhancementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
const ai_service_1 = require("../../ai/ai.service");
let EnhancementService = EnhancementService_1 = class EnhancementService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(EnhancementService_1.name);
        this.systemKnowledge = {
            employees: {
                model: 'User',
                fields: ['annualLeaveDays', 'usedLeaveDays', 'remainingLeaveDays', 'salary', 'hireDate'],
                servicePath: 'src/modules/users/users.service.ts',
                profilePath: 'web-admin/src/pages/employee-profile/EmployeeProfilePage.tsx',
            },
            leaves: {
                model: 'LeaveRequest',
                enumPath: 'prisma/schema.prisma',
                servicePath: 'src/modules/leaves/leaves.service.ts',
                types: ['ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'MATERNITY', 'PATERNITY'],
            },
            attendance: {
                model: 'Attendance',
                servicePath: 'src/modules/attendance/attendance.service.ts',
            },
            payroll: {
                model: 'PayrollRun',
                servicePath: 'src/modules/payroll-runs/payroll-runs.service.ts',
            },
        };
    }
    async executeEnhancement(message, subIntent, context) {
        try {
            this.logger.log(`Processing enhancement: ${subIntent} - "${message.substring(0, 50)}..."`);
            const analysis = await this.analyzeRequest(message);
            if (!analysis) {
                return {
                    success: false,
                    message: '❌ لم أستطع تحليل الطلب. حاول صياغة أوضح مثل: "ضيف نوع إجازة مرضية بحد 10 أيام"',
                };
            }
            const plan = this.planModifications(analysis);
            if (!plan.valid) {
                return {
                    success: false,
                    message: `❌ ${plan.error}`,
                };
            }
            const results = await this.executeModifications(plan, context);
            return {
                success: true,
                message: this.formatSuccessMessage(analysis, results),
                changes: results,
                requiresRebuild: plan.requiresRebuild,
            };
        }
        catch (error) {
            this.logger.error(`Enhancement error: ${error.message}`, error.stack);
            return {
                success: false,
                message: `❌ حدث خطأ أثناء التعديل: ${error.message}`,
            };
        }
    }
    async analyzeRequest(message) {
        const systemInstruction = `أنت محلل طلبات تعديل النظام. حول الطلب إلى JSON محدد.
العمليات المتاحة: add_enum, add_field, update_value, add_calculation
الأنظمة المتاحة: employees, leaves, attendance, payroll

أجب بـ JSON فقط بدون أي نص إضافي:
{
  "operation": "...",
  "targetSystem": "...",
  "description": "...",
  "details": { ... }
}`;
        const examples = `أمثلة:
"ضيف نوع إجازة مرضية" → {"operation":"add_enum","targetSystem":"leaves","description":"إضافة نوع إجازة مرضية","details":{"type":"SICK","limit":10}}
"كل موظف له 21 يوم إجازة" → {"operation":"update_value","targetSystem":"employees","description":"تحديث رصيد الإجازات","details":{"field":"annualLeaveDays","value":21}}`;
        try {
            const response = await this.aiService.generateContent(`${message}\n\n${examples}`, systemInstruction);
            const jsonMatch = response?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Analysis failed: ${error.message}`);
            return null;
        }
    }
    planModifications(analysis) {
        const { operation, targetSystem, details } = analysis;
        const systemInfo = this.systemKnowledge[targetSystem];
        if (!systemInfo) {
            return { valid: false, error: `النظام "${targetSystem}" غير معروف`, steps: [], requiresRebuild: false };
        }
        const steps = [];
        let requiresRebuild = false;
        switch (operation) {
            case 'add_enum':
                steps.push({
                    type: 'database',
                    action: 'add_enum_value',
                    target: systemInfo.enumPath,
                    value: details.type || details.value,
                });
                requiresRebuild = true;
                break;
            case 'add_field':
                steps.push({
                    type: 'database',
                    action: 'add_field',
                    model: systemInfo.model,
                    field: details.field,
                    fieldType: details.fieldType || 'String',
                });
                requiresRebuild = true;
                break;
            case 'update_value':
                steps.push({
                    type: 'database',
                    action: 'update_all',
                    model: systemInfo.model,
                    field: details.field,
                    value: details.value,
                });
                break;
            case 'add_calculation':
                steps.push({
                    type: 'service',
                    action: 'add_method',
                    path: systemInfo.servicePath,
                    details,
                });
                if (details.displayIn === 'profile') {
                    steps.push({
                        type: 'frontend',
                        action: 'display_in_profile',
                        path: systemInfo.profilePath,
                        field: details.field,
                    });
                }
                requiresRebuild = true;
                break;
            default:
                return { valid: false, error: `العملية "${operation}" غير مدعومة`, steps: [], requiresRebuild: false };
        }
        return { valid: true, steps, requiresRebuild };
    }
    async executeModifications(plan, context) {
        const results = [];
        for (const step of plan.steps) {
            try {
                switch (step.type) {
                    case 'database':
                        const dbResult = await this.executeDatabaseStep(step, context);
                        results.push(dbResult);
                        break;
                    case 'service':
                        results.push(`✅ Service: ${step.action} ready`);
                        break;
                    case 'frontend':
                        results.push(`✅ Frontend: ${step.action} ready`);
                        break;
                }
            }
            catch (error) {
                results.push(`⚠️ ${step.type}: ${error.message}`);
            }
        }
        return results;
    }
    async executeDatabaseStep(step, context) {
        switch (step.action) {
            case 'update_all':
                const updateResult = await this.prisma.user.updateMany({
                    where: { companyId: context.companyId },
                    data: { [step.field]: step.value },
                });
                return `✅ Database: تم تحديث ${updateResult.count} موظف - ${step.field} = ${step.value}`;
            case 'add_enum_value':
                return `⚠️ Database: نوع "${step.value}" يحتاج تعديل schema.prisma`;
            case 'add_field':
                return `⚠️ Database: حقل "${step.field}" يحتاج تعديل schema.prisma`;
            default:
                return `⚠️ Database: عملية "${step.action}" غير مدعومة`;
        }
    }
    formatSuccessMessage(analysis, results) {
        const header = `✅ **تم تنفيذ: ${analysis.description}**\n\n`;
        const details = results.map(r => `• ${r}`).join('\n');
        const footer = analysis.operation === 'update_value'
            ? '\n\n💡 التغييرات سارية المفعول فوراً.'
            : '\n\n⚠️ قد يلزم إعادة البناء لتطبيق التغييرات.';
        return header + details + footer;
    }
    getSystemKnowledge() {
        return this.systemKnowledge;
    }
};
exports.EnhancementService = EnhancementService;
exports.EnhancementService = EnhancementService = EnhancementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], EnhancementService);
//# sourceMappingURL=enhancement.service.js.map