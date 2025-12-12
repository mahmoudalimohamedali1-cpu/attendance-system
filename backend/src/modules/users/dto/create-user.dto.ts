import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
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

export class CreateUserDto {
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

  @ApiProperty({ description: 'رقم الهاتف', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'المسمى الوظيفي', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

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
}

