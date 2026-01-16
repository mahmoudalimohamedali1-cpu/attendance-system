import { EnrichedPolicyContext } from './policy-context.service';
export declare class FormulaParserService {
    private readonly logger;
    evaluateFormula(formula: string, context: EnrichedPolicyContext): Promise<number>;
    evaluateComplexCondition(condition: string, context: EnrichedPolicyContext): boolean;
    private replaceContextFields;
    private processFunctions;
    private evaluateMathExpression;
    private evaluateBooleanExpression;
    private isSafeMathExpression;
    private isSafeBooleanExpression;
    private getNestedValue;
    private isReservedWord;
    evaluateCount(field: string, operator: string, value: any, context: EnrichedPolicyContext): Promise<number>;
    evaluateSum(field: string, context: EnrichedPolicyContext): Promise<number>;
    evaluateAvg(field: string, context: EnrichedPolicyContext): Promise<number>;
    evaluateConsecutive(field: string, operator: string, value: any, context: EnrichedPolicyContext): Promise<number>;
}
