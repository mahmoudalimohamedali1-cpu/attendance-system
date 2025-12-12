import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';

enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export class RegisterDto {
  @ApiProperty({ description: 'البريد الإلكتروني', example: 'user@company.com' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @ApiProperty({ description: 'كلمة المرور', example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;

  @ApiProperty({ description: 'الاسم الأول', example: 'أحمد' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'الاسم الأخير', example: 'محمد' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'رقم الهاتف', example: '+966501234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'المسمى الوظيفي', example: 'مطور برمجيات', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ description: 'الدور', enum: Role, default: Role.EMPLOYEE })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ description: 'معرف الفرع', required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ description: 'معرف القسم', required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ description: 'معرف المدير المباشر', required: false })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

