import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  Matches,
} from 'class-validator';

enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export class CreateUserDto {
  // ===== البيانات الأساسية =====
  @ApiProperty({ description: 'البريد الإلكتروني' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @ApiProperty({ description: 'كلمة المرور', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;

  @ApiProperty({ description: 'الاسم الأول' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'الاسم الأخير' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'كود الموظف', required: false })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty({ description: 'رقم الهاتف', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  // ===== بيانات الهوية والإقامة (GOSI/HRSD) =====
  @ApiProperty({ description: 'رقم الهوية الوطنية (للسعوديين) أو رقم الإقامة (للأجانب)', required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ description: 'رقم الإقامة (للأجانب)', required: false })
  @IsOptional()
  @IsString()
  iqamaNumber?: string;

  @ApiProperty({ description: 'تاريخ انتهاء الإقامة', required: false })
  @IsOptional()
  @IsDateString()
  iqamaExpiryDate?: string;

  @ApiProperty({ description: 'رقم الجواز', required: false })
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiProperty({ description: 'تاريخ انتهاء الجواز', required: false })
  @IsOptional()
  @IsDateString()
  passportExpiryDate?: string;

  @ApiProperty({ description: 'رقم الحدود (للأجانب)', required: false })
  @IsOptional()
  @IsString()
  borderNumber?: string;

  // ===== بيانات التأمينات الاجتماعية =====
  @ApiProperty({ description: 'رقم التأمينات الاجتماعية (GOSI)', required: false })
  @IsOptional()
  @IsString()
  gosiNumber?: string;

  @ApiProperty({ description: 'تاريخ الميلاد', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'الجنس', enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ description: 'الحالة الاجتماعية', enum: MaritalStatus, required: false })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiProperty({ description: 'الجنسية', required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ description: 'هل الموظف سعودي؟', default: true })
  @IsOptional()
  @IsBoolean()
  isSaudi?: boolean;

  // ===== بيانات الوظيفة =====
  @ApiProperty({ description: 'المسمى الوظيفي', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ description: 'كود المهنة في قوى', required: false })
  @IsOptional()
  @IsString()
  professionCode?: string;

  @ApiProperty({ description: 'اسم المهنة', required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ description: 'الدور', enum: Role, default: Role.EMPLOYEE })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ description: 'الحالة', enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ description: 'الراتب', required: false })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiProperty({ description: 'تاريخ التوظيف', required: false })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  // ===== الفرع والقسم =====
  @ApiProperty({ description: 'معرف الفرع', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'معرف القسم', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: 'معرف المدير المباشر', required: false })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ description: 'معرف الدرجة الوظيفية', required: false })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiProperty({ description: 'عدد أيام الإجازة السنوية', default: 21 })
  @IsOptional()
  @IsNumber()
  annualLeaveDays?: number;

  @ApiProperty({ description: 'معرف مركز التكلفة', required: false })
  @IsOptional()
  @IsString()
  costCenterId?: string;
}
