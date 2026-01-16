export declare enum DocumentTypeEnum {
    ID_CARD = "ID_CARD",
    IQAMA = "IQAMA",
    PASSPORT = "PASSPORT",
    CONTRACT = "CONTRACT",
    CERTIFICATE = "CERTIFICATE",
    MEDICAL = "MEDICAL",
    BANK_LETTER = "BANK_LETTER",
    DRIVING_LICENSE = "DRIVING_LICENSE",
    QUALIFICATION = "QUALIFICATION",
    OTHER = "OTHER"
}
export declare enum RequestOnBehalfType {
    LEAVE = "LEAVE",
    LETTER = "LETTER",
    ADVANCE = "ADVANCE"
}
export declare class UploadDocumentDto {
    type: DocumentTypeEnum;
    title: string;
    titleAr?: string;
    description?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    notes?: string;
}
export declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    nationality?: string;
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    nationalId?: string;
    iqamaNumber?: string;
    iqamaExpiryDate?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    gosiNumber?: string;
}
export declare class LeaveRequestOnBehalfDto {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
}
export declare class LetterRequestOnBehalfDto {
    type: string;
    notes?: string;
}
export declare class AdvanceRequestOnBehalfDto {
    amount: number;
    reason: string;
    repaymentMonths?: number;
}
export declare class RequestOnBehalfDto {
    requestType: RequestOnBehalfType;
    leaveData?: LeaveRequestOnBehalfDto;
    letterData?: LetterRequestOnBehalfDto;
    advanceData?: AdvanceRequestOnBehalfDto;
}
export declare class AttendanceQueryDto {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
export interface ProfileOverviewResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    employeeCode: string | null;
    jobTitle: string | null;
    jobTitleRef: {
        id: string;
        name: string;
        nameEn: string | null;
        level: string;
    } | null;
    branch: {
        id: string;
        name: string;
        nameEn: string | null;
    } | null;
    department: {
        id: string;
        name: string;
        nameEn: string | null;
    } | null;
    manager: {
        id: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
    } | null;
    status: string;
    role: string;
    hireDate: Date | null;
    yearsOfService: number;
    isSaudi: boolean;
    nationality: string | null;
}
export interface AttendanceStatsResponse {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    workFromHomeDays: number;
    totalWorkingMinutes: number;
    totalOvertimeMinutes: number;
    averageCheckInTime: string | null;
    averageCheckOutTime: string | null;
    attendanceRate: number;
}
export interface LeaveBalanceResponse {
    annualLeaveDays: number;
    usedLeaveDays: number;
    remainingLeaveDays: number;
    leavesByType: {
        type: string;
        used: number;
        pending: number;
    }[];
}
export interface SalaryInfoResponse {
    basicSalary: number | null;
    totalSalary: number | null;
    salaryStructure: {
        id: string;
        name: string;
        components: {
            name: string;
            nameAr: string | null;
            amount: number;
            type: string;
        }[];
    } | null;
    gosiInfo: {
        gosiNumber: string | null;
        employeeContribution: number | null;
        employerContribution: number | null;
    } | null;
    bankAccount: {
        bankName: string;
        accountNumber: string;
        iban: string;
    } | null;
}
export interface ActivityTimelineItem {
    id: string;
    type: 'ATTENDANCE' | 'LEAVE' | 'LETTER' | 'SALARY' | 'DISCIPLINARY' | 'CUSTODY' | 'PROFILE_UPDATE';
    title: string;
    titleAr: string;
    description: string;
    date: Date;
    status?: string;
    metadata?: Record<string, any>;
}
