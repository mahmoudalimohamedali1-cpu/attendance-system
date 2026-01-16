import { LetterType, LetterStatus } from '@prisma/client';
export declare class LetterQueryDto {
    status?: LetterStatus;
    type?: LetterType;
    page?: number;
    limit?: number;
}
