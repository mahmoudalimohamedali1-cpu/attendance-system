import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum HRObjectionAction {
    CANCEL = 'CANCEL',
    CONTINUE = 'CONTINUE',
    CONFIRM = 'CONFIRM',
}

export class ObjectionReviewDto {
    @IsEnum(HRObjectionAction)
    @IsNotEmpty()
    action: HRObjectionAction;

    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;
}
