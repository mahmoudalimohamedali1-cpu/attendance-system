declare enum Role {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    EMPLOYEE = "EMPLOYEE"
}
declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare class UserQueryDto {
    search?: string;
    role?: Role;
    status?: UserStatus;
    branchId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
}
export {};
