import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SmartPolicyTrigger } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface TriggerContext {
    employeeId: string;
    employeeName: string;
    companyId: string;
    event: SmartPolicyTrigger;
    subEvent?: string;
    eventData?: any;
}

@Injectable()
export class SmartPolicyTriggerService {
    private readonly logger = new Logger(SmartPolicyTriggerService.name);

    constructor(private prisma: PrismaService) {}

    async triggerEvent(context: TriggerContext): Promise<void> {
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
        } catch (error) {
            this.logger.error(`Error triggering smart policies: ${error.message}`);
        }
    }

    private async evaluateAndExecute(policy: any, context: TriggerContext): Promise<void> {
        const parsed = policy.parsedRule;
        if (!parsed || !parsed.understood) {
            return;
        }

        const conditions = parsed.conditions || [];
        const conditionsMet = this.evaluateConditions(conditions, context);
        const conditionsLog = conditions.map((c: any) => ({
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
                actionValue: new Decimal(actionValue.toFixed(2)),
                actionResult: { applied: false, pendingPayroll: true },
                isSuccess: true,
            },
        });

        this.logger.log(`Recorded smart policy execution for ${policy.name}: ${actionValue} SAR for employee ${context.employeeName}`);
    }

    private evaluateConditions(conditions: any[], context: TriggerContext): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        for (const condition of conditions) {
            const field = condition.field || "";
            const operator = condition.operator || "EQUALS";
            const value = condition.value;

            // Day of week conditions (e.g., attendance.dayOfWeek === "FRIDAY")
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

            // Date-based conditions
            if (field === "event.date" && operator === "BEFORE") {
                const eventDate = context.eventData?.date ? new Date(context.eventData.date) : new Date();
                const targetDate = this.parseTargetDate(value);
                if (eventDate >= targetDate) {
                    this.logger.log(`Condition not met: event date ${eventDate} is not before ${targetDate}`);
                    return false;
                }
            }

            // Late minutes condition
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

    private parseTargetDate(value: string): Date {
        const now = new Date();
        if (value.startsWith("YYYY")) {
            const monthDay = value.substring(4);
            return new Date(`${now.getFullYear()}${monthDay}`);
        }
        return new Date(value);
    }
}
