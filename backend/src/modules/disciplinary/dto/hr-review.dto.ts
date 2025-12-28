import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum HRInitialAction {
    REJECT = 'REJECT',
    INFORMAL_NOTICE = 'INFORMAL_NOTICE',
    INFORMAL_WARNING = 'INFORMAL_WARNING',
    APPROVE_OFFICIAL = 'APPROVE_OFFICIAL',
}

export class HRReviewDto {
    @IsEnum(HRInitialAction)
    @IsNotEmpty()
    action: HRInitialAction;

    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason: string;

    @IsOptional()
    @IsString()
    hearingDatetime?: string;

    @IsOptional()
    @IsString()
    hearingLocation?: string;
}
