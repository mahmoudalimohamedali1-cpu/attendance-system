declare class SalaryStructureLineDto {
    componentId: string;
    amount: number;
    percentage?: number;
    priority?: number;
}
export declare class CreateSalaryStructureDto {
    name: string;
    description?: string;
    isActive?: boolean;
    lines: SalaryStructureLineDto[];
}
export {};
