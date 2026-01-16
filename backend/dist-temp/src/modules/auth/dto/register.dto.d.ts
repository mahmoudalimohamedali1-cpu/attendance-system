declare enum Role {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    EMPLOYEE = "EMPLOYEE"
}
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    jobTitle?: string;
    role?: Role;
    branchId?: string;
    departmentId?: string;
    managerId?: string;
}
export {};
