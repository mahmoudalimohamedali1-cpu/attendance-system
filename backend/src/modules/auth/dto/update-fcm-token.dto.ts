import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'FCM Token للإشعارات' })
  @IsString()
  @IsNotEmpty({ message: 'FCM Token مطلوب' })
  fcmToken: string;
}

