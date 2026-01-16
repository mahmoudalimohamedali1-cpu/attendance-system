import { LetterType } from '@prisma/client';
export interface LetterAttachment {
    originalName: string;
    filename: string;
    path?: string;
    url: string;
    size?: number;
    mimeType?: string;
}
export declare class CreateLetterRequestDto {
    type: LetterType;
    notes?: string;
    attachments?: LetterAttachment[];
}
