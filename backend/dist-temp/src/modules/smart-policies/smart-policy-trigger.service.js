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
var SmartPolicyTriggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPolicyTriggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
let SmartPolicyTriggerService = SmartPolicyTriggerService_1 = class SmartPolicyTriggerService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SmartPolicyTriggerService_1.name);
    }
    async triggerEvent(context) {
        this.logger.log(`Triggering smart policies for event: ${context.event}.${context.subEvent || "*"} for employee ${context.employeeId}`);
        try {
            const policies = await this.prisma.smartPolicy.findMany({
                where: {
                    companyId: context.companyId,
                    isActive: true,
                    triggerEvent: context.event,
                    ...(context.subEvent ? { triggerSubEvent: context.subEvent } : {}),
                },
            });
            this.logger.log(`Found ${policies.length} policies matching trigger ${context.event}.${context.subEvent}`);
            for (const policy of policies) {
                await this.evaluateAndExecute(policy, context);
            }
        }
        catch (error) {
            this.logger.error(`Error triggering smart policies: ${error.message}`);
        }
    }
    async evaluateAndExecute(policy, context) {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return;
        }
        const conditions = parsed.conditions || [];
        const conditionsMet = this.evaluateConditions(conditions, context);
        const conditionsLog = conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            met: conditionsMet,
        }));
        if (!conditionsMet) {
            this.logger.log(`Conditions not met for policy ${policy.name}, skipping execution`);
            return;
        }
        const actions = parsed.actions || [];
        if (actions.length === 0) {
            return;
        }
        const action = actions[0];
        const actionType = action.type;
        let actionValue = parseFloat(action.value) || 0;
        if (action.valueType === "PERCENTAGE") {
            const activeContract = await this.prisma.contract.findFirst({
                where: { userId: context.employeeId, status: "ACTIVE" },
                select: { basicSalary: true },
            });
            if (activeContract?.basicSalary) {
                actionValue = (Number(activeContract.basicSalary) * actionValue) / 100;
            }
        }
        await this.prisma.smartPolicyExecution.create({
            data: {
                policyId: policy.id,
                employeeId: context.employeeId,
                employeeName: context.employeeName,
                triggerEvent: context.event.toString(),
                triggerSubEvent: context.subEvent,
                triggerData: context.eventData || {},
                conditionsMet: true,
                conditionsLog,
                actionType,
                actionValue: new library_1.Decimal(actionValue.toFixed(2)),
                actionResult: { applied: false, pendingPayroll: true },
                isSuccess: true,
            },
        });
        this.logger.log(`Recorded smart policy execution for ${policy.name}: ${actionValue} SAR for employee ${context.employeeName}`);
    }
    evaluateConditions(conditions, context) {
        if (!conditions || conditions.length === 0) {
            return true;
        }
        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const value = condition.value;
            if (field.includes("dayOfWeek")) {
                const eventDayOfWeek = context.eventData?.dayOfWeek;
                if (eventDayOfWeek) {
                    const targetDay = value.toString().toUpperCase();
                    const actualDay = eventDayOfWeek.toString().toUpperCase();
                    if (operator === "EQUALS" && actualDay !== targetDay) {
                        this.logger.log(`Condition not met: dayOfWeek ${actualDay} !== ${targetDay}`);
                        return false;
                    }
                    if (operator === "NOT_EQUALS" && actualDay === targetDay) {
                        return false;
                    }
                }
            }
            if (field === "event.date" && operator === "BEFORE") {
                const eventDate = context.eventData?.date ? new Date(context.eventData.date) : new Date();
                const targetDate = this.parseTargetDate(value);
                if (eventDate >= targetDate) {
                    this.logger.log(`Condition not met: event date ${eventDate} is not before ${targetDate}`);
                    return false;
                }
            }
            if (field.includes("lateMinutes")) {
                const lateMinutes = context.eventData?.lateMinutes || 0;
                const threshold = parseInt(value) || 0;
                if (operator === "GREATER_THAN" && lateMinutes <= threshold) {
                    return false;
                }
                if (operator === "LESS_THAN" && lateMinutes >= threshold) {
                    return false;
                }
            }
        }
        return true;
    }
    parseTargetDate(value) {
        const now = new Date();
        if (value.startsWith("YYYY")) {
            const monthDay = value.substring(4);
            return new Date(`${now.getFullYear()}${monthDay}`);
        }
        return new Date(value);
    }
};
exports.SmartPolicyTriggerService = SmartPolicyTriggerService;
exports.SmartPolicyTriggerService = SmartPolicyTriggerService = SmartPolicyTriggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SmartPolicyTriggerService);
//# sourceMappingURL=smart-policy-trigger.service.js.map