export declare enum EmployeeAction {
    ACCEPT = "ACCEPT",
    REJECT = "REJECT",
    OBJECT = "OBJECT"
}
export declare class EmployeeResponseDto {
    action: EmployeeAction;
    comment?: string;
}
