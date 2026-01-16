import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollValidationService } from './payroll-validation.service';
import { WpsGeneratorService } from './wps-generator.service';
import { FormulaEngineService } from './services/formula-engine.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Response } from 'express';
export declare class PayrollCalculationController {
    private readonly service;
    private readonly validationService;
    private readonly wpsService;
    private readonly formulaEngine;
    private readonly permissionsService;
    constructor(service: PayrollCalculationService, validationService: PayrollValidationService, wpsService: WpsGeneratorService, formulaEngine: FormulaEngineService, permissionsService: PermissionsService);
    previewCalculation(employeeId: string, year: string, month: string, userId: string, companyId: string): Promise<import("./dto/calculation.types").EmployeePayrollCalculation>;
    validatePeriod(periodId: string, companyId: string): Promise<import("./payroll-validation.service").PayrollValidationResult>;
    exportWpsExcel(runId: string, companyId: string, res: Response): Promise<void>;
    exportWpsCsv(runId: string, companyId: string, res: Response): Promise<void>;
    testFormula(dto: {
        formula: string;
        basicSalary?: number;
        variables?: Record<string, number>;
    }): Promise<{
        formula: string;
        result: number;
        error: string | undefined;
        usedVariables: {
            name: string;
            value: number;
        }[];
        supportedVariables: string[];
        supportedFunctions: string[];
    }>;
    getFormulaInfo(): Promise<{
        supportedVariables: string[];
        supportedFunctions: string[];
        examples: {
            formula: string;
            description: string;
        }[];
    }>;
}
