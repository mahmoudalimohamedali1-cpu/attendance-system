import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID, IsBoolean } from 'class-validator';

// أنواع المستندات
export enum DocumentTypeEnum {
    ID_CARD = 'ID_CARD',
    IQAMA = 'IQAMA',
    PASSPORT = 'PASSPORT',
    CONTRACT = 'CONTRACT',
    CERTIFICATE = 'CERTIFICATE',
    MEDICAL = 'MEDICAL',
    BANK_LETTER = 'BANK_LETTER',
    DRIVING_LICENSE = 'DRIVING_LICENSE',
    QUALIFICATION = 'QUALIFICATION',
    OTHER = 'OTHER',
}

// أنواع الطلبات بالنيابة
export enum RequestOnBehalfType {
    LEAVE = 'LEAVE',
    LETTER = 'LETTER',
    ADVANCE = 'ADVANCE',
}

// DTO لرفع مستند
export class UploadDocumentDto {
    @IsEnum(DocumentTypeEnum)
    type: DocumentTypeEnum;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    titleAr?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    documentNumber?: string;

    @IsDateString()
    @IsOptional()
    issueDate?: string;

    @IsDateString()
    @IsOptional()
    expiryDate?: string;

    @IsString()
    @IsOptional()
    issuingAuthority?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

// DTO لتحديث البيانات الشخصية
export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    nationality?: string;

    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    maritalStatus?: string;

    @IsString()
    @IsOptional()
    nationalId?: string;

    @IsString()
    @IsOptional()
    iqamaNumber?: string;

    @IsDateString()
    @IsOptional()
    iqamaExpiryDate?: string;

    @IsString()
    @IsOptional()
    passportNumber?: string;

    @IsDateString()
    @IsOptional()
    passportExpiryDate?: string;

    @IsString()
    @IsOptional()
    gosiNumber?: string;
}

// DTO لطلب بالنيابة - إجازة
export class LeaveRequestOnBehalfDto {
    @IsString()
    type: string; // LeaveType

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsString()
    reason: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

// DTO لطلب بالنيابة - خطاب
export class LetterRequestOnBehalfDto {
    @IsString()
    type: string; // LetterType

    @IsString()
    @IsOptional()
    notes?: string;
}

// DTO لطلب بالنيابة - سلفة
export class AdvanceRequestOnBehalfDto {
    @IsNumber()
    amount: number;

    @IsString()
    reason: string;

    @IsNumber()
    @IsOptional()
    repaymentMonths?: number;
}

// DTO لطلب بالنيابة الرئيسي
export class RequestOnBehalfDto {
    @IsEnum(RequestOnBehalfType)
    requestType: RequestOnBehalfType;

    @IsOptional()
    leaveData?: LeaveRequestOnBehalfDto;

    @IsOptional()
    letterData?: LetterRequestOnBehalfDto;

    @IsOptional()
    advanceData?: AdvanceRequestOnBehalfDto;
}

// DTO لفلترة سجل الحضور
export class AttendanceQueryDto {
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsNumber()
    @IsOptional()
    page?: number;

    @IsNumber()
    @IsOptional()
    limit?: number;
}

// Response DTOs
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
    attendanceRate: number; // نسبة الحضور
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
