import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'البريد الإلكتروني أو رقم الهاتف',
    example: 'user@company.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'كلمة المرور',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password: string;

  @ApiProperty({
    description: 'تذكرني',
    example: true,
    required: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}

