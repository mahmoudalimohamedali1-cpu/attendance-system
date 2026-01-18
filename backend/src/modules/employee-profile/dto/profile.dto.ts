import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID, IsBoolean, IsEmail, IsInt, Min, Max, MinLength, MaxLength, IsArray } from 'class-validator';

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

// =====================================================
// Emergency Contact DTOs - جهات الاتصال في حالات الطوارئ
// =====================================================

// نوع العلاقة
export enum RelationshipType {
    SPOUSE = 'SPOUSE',          // زوج/زوجة
    PARENT = 'PARENT',          // أب/أم
    SIBLING = 'SIBLING',        // أخ/أخت
    CHILD = 'CHILD',            // ابن/ابنة
    RELATIVE = 'RELATIVE',      // قريب
    FRIEND = 'FRIEND',          // صديق
    NEIGHBOR = 'NEIGHBOR',      // جار
    COLLEAGUE = 'COLLEAGUE',    // زميل عمل
    OTHER = 'OTHER',            // آخر
}

// DTO لإنشاء جهة اتصال طوارئ
export class CreateEmergencyContactDto {
    @IsString()
    @MinLength(2, { message: 'اسم جهة الاتصال يجب أن يكون حرفين على الأقل' })
    @MaxLength(100, { message: 'اسم جهة الاتصال يجب ألا يتجاوز 100 حرف' })
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    nameAr?: string;

    @IsString()
    @MinLength(2, { message: 'نوع العلاقة مطلوب' })
    relationship: string;

    @IsString()
    @MinLength(9, { message: 'رقم الهاتف يجب أن يكون 9 أرقام على الأقل' })
    @MaxLength(20, { message: 'رقم الهاتف يجب ألا يتجاوز 20 رقم' })
    phone: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    alternatePhone?: string;

    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    @IsOptional()
    email?: string;

    @IsInt()
    @Min(1, { message: 'الأولوية يجب أن تكون بين 1 و 3' })
    @Max(3, { message: 'الأولوية يجب أن تكون بين 1 و 3' })
    @IsOptional()
    priority?: number;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    address?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    city?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    country?: string;
}

// DTO لتحديث جهة اتصال طوارئ
export class UpdateEmergencyContactDto {
    @IsString()
    @MinLength(2, { message: 'اسم جهة الاتصال يجب أن يكون حرفين على الأقل' })
    @MaxLength(100, { message: 'اسم جهة الاتصال يجب ألا يتجاوز 100 حرف' })
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    nameAr?: string;

    @IsString()
    @IsOptional()
    relationship?: string;

    @IsString()
    @MinLength(9, { message: 'رقم الهاتف يجب أن يكون 9 أرقام على الأقل' })
    @MaxLength(20, { message: 'رقم الهاتف يجب ألا يتجاوز 20 رقم' })
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    alternatePhone?: string;

    @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
    @IsOptional()
    email?: string;

    @IsInt()
    @Min(1, { message: 'الأولوية يجب أن تكون بين 1 و 3' })
    @Max(3, { message: 'الأولوية يجب أن تكون بين 1 و 3' })
    @IsOptional()
    priority?: number;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    address?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    city?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    country?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

// =====================================================
// Skills DTOs - المهارات والكفاءات
// =====================================================

// مستوى الإتقان
export enum ProficiencyLevelEnum {
    BEGINNER = 'BEGINNER',          // مبتدئ
    INTERMEDIATE = 'INTERMEDIATE',  // متوسط
    ADVANCED = 'ADVANCED',          // متقدم
    EXPERT = 'EXPERT',              // خبير
}

// DTO لإضافة مهارة
export class CreateSkillDto {
    @IsString()
    @MinLength(2, { message: 'اسم المهارة يجب أن يكون حرفين على الأقل' })
    @MaxLength(100, { message: 'اسم المهارة يجب ألا يتجاوز 100 حرف' })
    skillName: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    skillNameAr?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    category?: string;

    @IsEnum(ProficiencyLevelEnum, { message: 'مستوى الإتقان غير صحيح' })
    proficiencyLevel: ProficiencyLevelEnum;

    @IsInt()
    @Min(0, { message: 'سنوات الخبرة يجب أن تكون صفر أو أكثر' })
    @Max(50, { message: 'سنوات الخبرة يجب ألا تتجاوز 50 سنة' })
    @IsOptional()
    yearsExperience?: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;
}

// DTO لتحديث مهارة
export class UpdateSkillDto {
    @IsString()
    @MinLength(2, { message: 'اسم المهارة يجب أن يكون حرفين على الأقل' })
    @MaxLength(100, { message: 'اسم المهارة يجب ألا يتجاوز 100 حرف' })
    @IsOptional()
    skillName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    skillNameAr?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    category?: string;

    @IsEnum(ProficiencyLevelEnum, { message: 'مستوى الإتقان غير صحيح' })
    @IsOptional()
    proficiencyLevel?: ProficiencyLevelEnum;

    @IsInt()
    @Min(0, { message: 'سنوات الخبرة يجب أن تكون صفر أو أكثر' })
    @Max(50, { message: 'سنوات الخبرة يجب ألا تتجاوز 50 سنة' })
    @IsOptional()
    yearsExperience?: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;

    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;
}

// DTO للبحث عن موظفين بمهارة معينة
export class SearchSkillsQueryDto {
    @IsString()
    @MinLength(2)
    skillName: string;

    @IsEnum(ProficiencyLevelEnum)
    @IsOptional()
    minProficiency?: ProficiencyLevelEnum;
}

// =====================================================
// Profile Update Request DTOs - طلبات تحديث الملف الشخصي
// =====================================================

// نوع التحديث
export enum ProfileUpdateType {
    PERSONAL_INFO = 'PERSONAL_INFO',    // معلومات شخصية
    CONTACT_INFO = 'CONTACT_INFO',      // معلومات الاتصال
    DOCUMENT_INFO = 'DOCUMENT_INFO',    // معلومات الوثائق
    BANK_INFO = 'BANK_INFO',            // معلومات البنك
    ADDRESS_INFO = 'ADDRESS_INFO',      // معلومات العنوان
    OTHER = 'OTHER',                    // أخرى
}

// حالة طلب التحديث
export enum ProfileUpdateStatus {
    PENDING = 'PENDING',        // قيد المراجعة
    APPROVED = 'APPROVED',      // موافق عليه
    REJECTED = 'REJECTED',      // مرفوض
    CANCELLED = 'CANCELLED',    // ملغي
}

// DTO لإنشاء طلب تحديث الملف الشخصي
export class CreateProfileUpdateRequestDto {
    @IsEnum(ProfileUpdateType, { message: 'نوع التحديث غير صحيح' })
    updateType: ProfileUpdateType;

    @IsString()
    @MinLength(1, { message: 'اسم الحقل مطلوب' })
    fieldName: string;

    @IsString()
    @MinLength(1, { message: 'القيمة المطلوبة مطلوبة' })
    requestedValue: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reason?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reasonAr?: string;

    @IsArray()
    @IsOptional()
    supportingDocuments?: string[];
}

// DTO لمراجعة طلب تحديث الملف الشخصي (للموافقة/الرفض)
export class ReviewProfileUpdateDto {
    @IsEnum(ProfileUpdateStatus, { message: 'حالة المراجعة غير صحيحة' })
    status: ProfileUpdateStatus;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reviewNote?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    rejectionReason?: string;
}

// DTO لفلترة طلبات التحديث
export class ProfileUpdateRequestQueryDto {
    @IsEnum(ProfileUpdateStatus)
    @IsOptional()
    status?: ProfileUpdateStatus;

    @IsEnum(ProfileUpdateType)
    @IsOptional()
    updateType?: ProfileUpdateType;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;
}

// =====================================================
// Document Update DTO - تحديث المستند
// =====================================================

// DTO لتحديث مستند
export class UpdateDocumentDto {
    @IsEnum(DocumentTypeEnum)
    @IsOptional()
    type?: DocumentTypeEnum;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    titleAr?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    documentNumber?: string;

    @IsDateString()
    @IsOptional()
    issueDate?: string;

    @IsDateString()
    @IsOptional()
    expiryDate?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    issuingAuthority?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    notes?: string;

    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;
}

// =====================================================
// Response DTOs for new features
// =====================================================

// استجابة جهات الاتصال في حالات الطوارئ
export interface EmergencyContactResponse {
    id: string;
    name: string;
    nameAr: string | null;
    relationship: string;
    phone: string;
    alternatePhone: string | null;
    email: string | null;
    priority: number;
    address: string | null;
    city: string | null;
    country: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// استجابة المهارة
export interface SkillResponse {
    id: string;
    skillName: string;
    skillNameAr: string | null;
    category: string | null;
    proficiencyLevel: ProficiencyLevelEnum;
    yearsExperience: number | null;
    isVerified: boolean;
    verifiedBy: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    verifiedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// استجابة المهارات مجمعة حسب الفئة
export interface SkillsGroupedResponse {
    skills: {
        category: string;
        items: SkillResponse[];
    }[];
    stats: {
        total: number;
        verified: number;
        byProficiency: {
            beginner: number;
            intermediate: number;
            advanced: number;
            expert: number;
        };
    };
}

// استجابة طلب تحديث الملف الشخصي
export interface ProfileUpdateRequestResponse {
    id: string;
    updateType: string;
    fieldName: string;
    currentValue: string | null;
    requestedValue: string;
    reason: string | null;
    reasonAr: string | null;
    status: string;
    supportingDocuments: string[] | null;
    reviewedBy: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    rejectionReason: string | null;
    appliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
