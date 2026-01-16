export declare class FormulaEngineService {
    private readonly logger;
    private static readonly SUPPORTED_VARIABLES;
    private static readonly FUNCTIONS;
    evaluate(formula: string, variables: Record<string, number>): {
        value: number;
        error?: string;
    };
    private securityValidation;
    private substituteVariables;
    private evaluateExpression;
    private processFunctions;
    private processConditionals;
    private splitByTopLevelComma;
    private evaluateCondition;
    private toRPN;
    private evaluateRPN;
    buildVariableContext(params: any): Record<string, number>;
    extractDependencies(formula: string): string[];
    getSupportedVariables(): string[];
    getSupportedFunctions(): string[];
}
