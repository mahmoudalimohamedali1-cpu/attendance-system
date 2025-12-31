import { Module, forwardRef } from "@nestjs/common";
import { SmartPoliciesController } from "./smart-policies.controller";
import { SmartPoliciesService } from "./smart-policies.service";
import { SmartPolicyExecutorService } from "./smart-policy-executor.service";
import { SmartPolicyTriggerService } from "./smart-policy-trigger.service";
import { AIPolicyEvaluatorService } from "./ai-policy-evaluator.service";
import { PolicyContextService } from "./policy-context.service";
import { FormulaParserService } from "./formula-parser.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AiModule } from "../ai/ai.module";

@Module({
    imports: [PrismaModule, forwardRef(() => AiModule)],
    controllers: [SmartPoliciesController],
    providers: [
        SmartPoliciesService,
        SmartPolicyExecutorService,
        SmartPolicyTriggerService,
        AIPolicyEvaluatorService,
        PolicyContextService,
        FormulaParserService,
    ],
    exports: [
        SmartPoliciesService,
        SmartPolicyExecutorService,
        SmartPolicyTriggerService,
        AIPolicyEvaluatorService,
        PolicyContextService,
        FormulaParserService,
    ],
})
export class SmartPoliciesModule { }
