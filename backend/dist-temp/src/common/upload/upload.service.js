"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
let UploadService = class UploadService {
    constructor() {
        this.uploadDir = '/var/www/attendance-system/uploads';
        this.maxFileSize = 10 * 1024 * 1024;
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        this.ensureUploadDirExists();
    }
    ensureUploadDirExists() {
        const leavesDir = path.join(this.uploadDir, 'leaves');
        const lettersDir = path.join(this.uploadDir, 'letters');
        const advancesDir = path.join(this.uploadDir, 'advances');
        const raisesDir = path.join(this.uploadDir, 'raises');
        [leavesDir, lettersDir, advancesDir, raisesDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    async uploadLeaveAttachments(files) {
        return this.uploadFiles(files, 'leaves');
    }
    async deleteFile(filePath) {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
    async uploadAdvanceAttachments(files) {
        return this.uploadFiles(files, 'advances');
    }
    async uploadRaiseAttachments(files) {
        return this.uploadFiles(files, 'raises');
    }
    async uploadFiles(files, subDir) {
        if (!files || files.length === 0) {
            return [];
        }
        const uploadedFiles = [];
        for (const file of files) {
            if (file.size > this.maxFileSize) {
                throw new common_1.BadRequestException(`الملف ${file.originalname} أكبر من الحد المسموح (10MB)`);
            }
            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                throw new common_1.BadRequestException(`نوع الملف ${file.originalname} غير مسموح به`);
            }
            const ext = path.extname(file.originalname);
            const filename = `${(0, uuid_1.v4)()}${ext}`;
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
    async uploadLetterAttachments(files) {
        return this.uploadFiles(files, 'letters');
    }
    async deleteLeaveAttachments(attachments) {
        if (!attachments)
            return;
        for (const attachment of attachments) {
            if (attachment.url) {
                await this.deleteFile(attachment.url);
            }
        }
    }
    async deleteLetterAttachments(attachments) {
        if (!attachments)
            return;
        for (const attachment of attachments) {
            if (attachment.url) {
                await this.deleteFile(attachment.url);
            }
        }
    }
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
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
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UploadService);
//# sourceMappingURL=upload.service.js.map