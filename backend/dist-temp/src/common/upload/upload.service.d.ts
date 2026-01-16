export interface UploadedFile {
    originalName: string;
    filename: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
}
export declare class UploadService {
    private readonly uploadDir;
    private readonly maxFileSize;
    private readonly allowedMimeTypes;
    constructor();
    private ensureUploadDirExists;
    uploadLeaveAttachments(files: Express.Multer.File[]): Promise<UploadedFile[]>;
    deleteFile(filePath: string): Promise<void>;
    uploadAdvanceAttachments(files: Express.Multer.File[]): Promise<UploadedFile[]>;
    uploadRaiseAttachments(files: Express.Multer.File[]): Promise<UploadedFile[]>;
    private uploadFiles;
    uploadLetterAttachments(files: Express.Multer.File[]): Promise<UploadedFile[]>;
    deleteLeaveAttachments(attachments: any[]): Promise<void>;
    deleteLetterAttachments(attachments: any[]): Promise<void>;
    getMimeType(filename: string): string;
}
