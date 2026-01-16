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
declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}
declare enum MaritalStatus {
    SINGLE = "SINGLE",
    MARRIED = "MARRIED",
    DIVORCED = "DIVORCED",
    WIDOWED = "WIDOWED"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    phone?: string;
    nationalId?: string;
    iqamaNumber?: string;
    iqamaExpiryDate?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    borderNumber?: string;
    gosiNumber?: string;
    dateOfBirth?: string;
    gender?: Gender;
    maritalStatus?: MaritalStatus;
    nationality?: string;
    isSaudi?: boolean;
    jobTitle?: string;
    professionCode?: string;
    profession?: string;
    role?: Role;
    status?: UserStatus;
    salary?: number;
    hireDate?: string;
    branchId?: string;
    departmentId?: string;
    managerId?: string;
    jobTitleId?: string;
    annualLeaveDays?: number;
    costCenterId?: string;
}
export {};
