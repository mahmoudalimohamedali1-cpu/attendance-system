import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token (camelCase)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Refresh Token (snake_case)' })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  // Getter to get the token from either field
  getToken(): string {
    return this.refreshToken || this.refresh_token || '';
  }
}
