
import { PrismaClient } from '@prisma/client';
import { PayrollCalculationService } from './src/modules/payroll-calculation/payroll-calculation.service';
import { PoliciesService } from './src/modules/policies/policies.service';
import { PolicyRuleEvaluatorService } from './src/modules/payroll-calculation/services/policy-rule-evaluator.service';
import { FormulaEngineService } from './src/modules/payroll-calculation/services/formula-engine.service';
import { EosService } from './src/modules/eos/eos.service';
import { SmartPolicyExecutorService } from './src/modules/smart-policies/smart-policy-executor.service';
import { AIPolicyEvaluatorService } from './src/modules/smart-policies/ai-policy-evaluator.service';
import { LeaveCalculationService } from './src/modules/leaves/leave-calculation.service';

async function liveAudit() {
    const prisma = new PrismaClient();
    try {
        // 1. Get a real employee with salary
        const employee = await prisma.user.findFirst({
            where: { salaryAssignments: { some: { isActive: true } } },
            include: { salaryAssignments: true }
        });

        if (!employee) {
            console.log("No employee found with salary assignment!");
            return;
        }

        console.log(`REAL TEST SUBJECT: ${employee.firstName} (ID: ${employee.id})`);

        // 2. Instantiate Service (Manual Dependency Injection for test script)
        const formulaEngine = new FormulaEngineService();
        const policyEvaluator = new PolicyRuleEvaluatorService(prisma, formulaEngine);
        const leaveCalc = new LeaveCalculationService(prisma);
        const eosService = new EosService(prisma, leaveCalc);
        const smartPolicy = new SmartPolicyExecutorService(prisma);
        const aiPolicy = new AIPolicyEvaluatorService(prisma);
        const policiesService = new PoliciesService(prisma);

        const payrollService = new PayrollCalculationService(
            prisma,
            policiesService,
            policyEvaluator,
            formulaEngine,
            eosService,
            smartPolicy,
            aiPolicy
        );

        // 3. Run Calculation for Jan 2026
        const startDate = new Date(2026, 0, 1);
        const endDate = new Date(2026, 0, 31);

        console.log("RUNNING ACTUAL CALCULATION...");
        const result = await payrollService.calculateForEmployee(
            employee.id,
            employee.companyId,
            startDate,
            endDate,
            2026,
            1
        );

        console.log("CALCULATION_RESULT_START");
        console.log(JSON.stringify(result, null, 2));
        console.log("CALCULATION_RESULT_END");

    } catch (err) {
        console.error("LIVE TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

liveAudit();
