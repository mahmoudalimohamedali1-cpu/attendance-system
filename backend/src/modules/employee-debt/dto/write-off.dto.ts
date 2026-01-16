import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WriteOffDto {
    @ApiProperty({ description: 'سبب الشطب', example: 'Employee termination - debt forgiven' })
    @IsString()
    @MinLength(10)
    reason: string;
}
