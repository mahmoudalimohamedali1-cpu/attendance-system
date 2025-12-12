import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'البريد الإلكتروني', example: 'user@company.com' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;
}

