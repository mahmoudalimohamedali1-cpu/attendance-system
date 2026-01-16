import { IsString, IsUUID } from 'class-validator';

export class CreateReviewDto {
    @IsUUID()
    cycleId: string;

    @IsUUID()
    employeeId: string;

    @IsUUID()
    managerId: string;
}
