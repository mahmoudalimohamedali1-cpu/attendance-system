import { Injectable, BadRequestException } from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

export interface UploadedFile {
    originalName: string;
    filename: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
    thumbnailPath?: string;
    thumbnailUrl?: string;
}

@Injectable()
export class UploadService {
    private readonly uploadDir = '/var/www/attendance-system/uploads';
    private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
    private readonly allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    // Configurable file size limits per document type
    private readonly fileSizeLimits = {
        profilePhoto: 5 * 1024 * 1024, // 5MB for profile photos
        idDocument: 10 * 1024 * 1024, // 10MB for ID documents
        contract: 15 * 1024 * 1024, // 15MB for contracts
        default: 10 * 1024 * 1024, // 10MB default
    };

    constructor() {
        // إنشاء مجلد الرفع إذا لم يكن موجوداً
        this.ensureUploadDirExists();
    }

    private ensureUploadDirExists() {
        const leavesDir = path.join(this.uploadDir, 'leaves');
        const lettersDir = path.join(this.uploadDir, 'letters');
        const advancesDir = path.join(this.uploadDir, 'advances');
        const raisesDir = path.join(this.uploadDir, 'raises');
        const employeesDir = path.join(this.uploadDir, 'employees');

        [leavesDir, lettersDir, advancesDir, raisesDir, employeesDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * رفع ملفات طلب الإجازة
     */
    async uploadLeaveAttachments(
        files: Express.Multer.File[],
    ): Promise<UploadedFile[]> {
        return this.uploadFiles(files, 'leaves');
    }

    /**
     * حذف ملف
     */
    async deleteFile(filePath: string): Promise<void> {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }

    /**
     * رفع ملفات طلب السلفة
     */
    async uploadAdvanceAttachments(
        files: Express.Multer.File[],
    ): Promise<UploadedFile[]> {
        return this.uploadFiles(files, 'advances');
    }

    /**
     * رفع ملفات طلب الزيادة
     */
    async uploadRaiseAttachments(
        files: Express.Multer.File[],
    ): Promise<UploadedFile[]> {
        return this.uploadFiles(files, 'raises');
    }

    private async uploadFiles(files: Express.Multer.File[], subDir: string): Promise<UploadedFile[]> {
        if (!files || files.length === 0) {
            return [];
        }

        const uploadedFiles: UploadedFile[] = [];

        for (const file of files) {
            if (file.size > this.maxFileSize) {
                throw new BadRequestException(`الملف ${file.originalname} أكبر من الحد المسموح (10MB)`);
            }

            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException(`نوع الملف ${file.originalname} غير مسموح به`);
            }

            const ext = path.extname(file.originalname);
            const filename = `${uuidv4()}${ext}`;
            const filePath = path.join(this.uploadDir, subDir, filename);

            fs.writeFileSync(filePath, file.buffer);

            uploadedFiles.push({
                originalName: file.originalname,
                filename,
                path: `/uploads/${subDir}/${filename}`,
                url: `/uploads/${subDir}/${filename}`,
                size: file.size,
                mimeType: file.mimetype,
            });
        }

        return uploadedFiles;
    }

    /**
     * رفع ملفات طلب الخطاب
     */
    async uploadLetterAttachments(
        files: Express.Multer.File[],
    ): Promise<UploadedFile[]> {
        return this.uploadFiles(files, 'letters');
    }

    /**
     * حذف مرفقات الإجازة
     */
    async deleteLeaveAttachments(attachments: any[]): Promise<void> {
        if (!attachments) return;

        for (const attachment of attachments) {
            if (attachment.url) {
                await this.deleteFile(attachment.url);
            }
        }
    }

    /**
     * حذف مرفقات الخطاب
     */
    async deleteLetterAttachments(attachments: any[]): Promise<void> {
        if (!attachments) return;

        for (const attachment of attachments) {
            if (attachment.url) {
                await this.deleteFile(attachment.url);
            }
        }
    }

    /**
     * رفع مستندات الموظفين
     */
    async uploadEmployeeDocuments(
        files: Express.Multer.File[],
        documentType: 'profilePhoto' | 'idDocument' | 'contract' | 'default' = 'default',
    ): Promise<UploadedFile[]> {
        if (!files || files.length === 0) {
            return [];
        }

        const uploadedFiles: UploadedFile[] = [];
        const maxSize = this.fileSizeLimits[documentType];

        for (const file of files) {
            if (file.size > maxSize) {
                const maxSizeMB = Math.round(maxSize / (1024 * 1024));
                throw new BadRequestException(`الملف ${file.originalname} أكبر من الحد المسموح (${maxSizeMB}MB)`);
            }

            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException(`نوع الملف ${file.originalname} غير مسموح به`);
            }

            const ext = path.extname(file.originalname);
            const filename = `${uuidv4()}${ext}`;
            const filePath = path.join(this.uploadDir, 'employees', filename);

            fs.writeFileSync(filePath, file.buffer);

            const uploadedFile: UploadedFile = {
                originalName: file.originalname,
                filename,
                path: `/uploads/employees/${filename}`,
                url: `/uploads/employees/${filename}`,
                size: file.size,
                mimeType: file.mimetype,
            };

            // Generate thumbnail for image files
            if (file.mimetype.startsWith('image/')) {
                try {
                    const thumbnailFilename = await this.generateThumbnail(filePath, filename);
                    uploadedFile.thumbnailPath = `/uploads/employees/${thumbnailFilename}`;
                    uploadedFile.thumbnailUrl = `/uploads/employees/${thumbnailFilename}`;
                } catch (error) {
                    // If thumbnail generation fails, continue without it
                }
            }

            uploadedFiles.push(uploadedFile);
        }

        return uploadedFiles;
    }

    /**
     * إنشاء صورة مصغرة للصور
     */
    private async generateThumbnail(filePath: string, originalFilename: string): Promise<string> {
        const ext = path.extname(originalFilename);
        const thumbnailFilename = `thumb_${path.basename(originalFilename, ext)}${ext}`;
        const thumbnailPath = path.join(this.uploadDir, 'employees', thumbnailFilename);

        await sharp(filePath)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center',
            })
            .toFile(thumbnailPath);

        return thumbnailFilename;
    }

    /**
     * الحصول على الـ MIME type من الامتداد
     */
    getMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
