import { IsString, IsNotEmpty, IsDateString, IsOptional, MaxLength, IsArray, IsEnum, IsUUID } from 'class-validator';

// أنواع المخالفات
export enum ViolationType {
    ATTENDANCE = 'ATTENDANCE',
    BEHAVIOR = 'BEHAVIOR',
    PERFORMANCE = 'PERFORMANCE',
    POLICY_VIOLATION = 'POLICY_VIOLATION',
    SAFETY = 'SAFETY',
    HARASSMENT = 'HARASSMENT',
    THEFT = 'THEFT',
    CONFIDENTIALITY = 'CONFIDENTIALITY',
    OTHER = 'OTHER',
}

export class CreateCaseDto {
    @IsUUID()
    @IsNotEmpty()
    employeeId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsEnum(ViolationType)
    violationType?: ViolationType;

    @IsDateString()
    @IsNotEmpty()
    incidentDate: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    incidentLocation: string;

    @IsOptional()
    involvedParties?: any;

    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    description: string;

    @IsOptional()
    @IsString()
    retrospectiveReason?: string;

    @IsOptional()
    @IsArray()
    attachments?: any[];
}
