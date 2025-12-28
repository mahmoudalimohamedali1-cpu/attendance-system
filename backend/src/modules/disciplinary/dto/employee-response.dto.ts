import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum EmployeeAction {
    ACCEPT = 'ACCEPT',
    REJECT = 'REJECT',
    OBJECT = 'OBJECT',
}

export class EmployeeResponseDto {
    @IsEnum(EmployeeAction)
    @IsNotEmpty()
    action: EmployeeAction;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}
