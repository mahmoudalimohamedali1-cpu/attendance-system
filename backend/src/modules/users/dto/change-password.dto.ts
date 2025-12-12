import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'كلمة المرور الحالية' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: 'كلمة المرور الجديدة', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' })
  newPassword: string;
}

