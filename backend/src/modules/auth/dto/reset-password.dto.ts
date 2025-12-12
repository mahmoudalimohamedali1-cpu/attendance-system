import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'توكن إعادة التعيين' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'كلمة المرور الجديدة', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  newPassword: string;
}

