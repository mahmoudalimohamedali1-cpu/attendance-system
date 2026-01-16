"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecureFileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureFileService = void 0;
const common_1 = require("@nestjs/common");
const path = require("path");
const fs = require("fs");
let SecureFileService = SecureFileService_1 = class SecureFileService {
    constructor() {
        this.logger = new common_1.Logger(SecureFileService_1.name);
        this.allowedDirectories = [
            {
                alias: 'backend_src',
                basePath: process.env.BACKEND_PATH
                    ? path.join(process.env.BACKEND_PATH, 'src')
                    : '/var/www/attendance-system/backend/src',
                allowRead: true,
                allowWrite: true,
                allowDelete: false,
                extensions: ['.ts', '.json', '.dto.ts', '.service.ts', '.controller.ts', '.module.ts'],
                requiresAdmin: true,
            },
            {
                alias: 'frontend_src',
                basePath: process.env.FRONTEND_PATH
                    ? path.join(process.env.FRONTEND_PATH, 'src')
                    : '/var/www/attendance-system/web-admin/src',
                allowRead: true,
                allowWrite: true,
                allowDelete: false,
                extensions: ['.tsx', '.ts', '.css', '.json'],
                requiresAdmin: true,
            },
            {
                alias: 'prisma',
                basePath: process.env.BACKEND_PATH
                    ? path.join(process.env.BACKEND_PATH, 'prisma')
                    : '/var/www/attendance-system/backend/prisma',
                allowRead: true,
                allowWrite: false,
                allowDelete: false,
                extensions: ['.prisma'],
                requiresAdmin: true,
            },
            {
                alias: 'logs',
                basePath: '/var/log/attendance-system',
                allowRead: true,
                allowWrite: false,
                allowDelete: false,
                extensions: ['.log'],
                requiresAdmin: true,
            },
            {
                alias: 'backups',
                basePath: '/var/backups/attendance-system',
                allowRead: true,
                allowWrite: true,
                allowDelete: false,
                extensions: ['.json', '.sql', '.backup'],
                requiresAdmin: true,
            },
        ];
        this.blockedPatterns = [
            /\.\./,
            /~\//,
            /\/etc\//,
            /\/proc\//,
            /\/dev\//,
            /node_modules/,
            /\.env/,
            /\.git\//,
            /password/i,
            /secret/i,
            /private/i,
        ];
    }
    validatePath(relativePath, operation, userRole) {
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(relativePath)) {
                this.logger.warn(`Blocked dangerous path pattern: ${relativePath}`);
                return { valid: false, error: 'Path contains blocked pattern' };
            }
        }
        for (const dir of this.allowedDirectories) {
            if (relativePath.startsWith(dir.alias + '/') || relativePath.startsWith(dir.alias + '\\')) {
                const subPath = relativePath.substring(dir.alias.length + 1);
                const fullPath = path.resolve(dir.basePath, subPath);
                if (!fullPath.startsWith(dir.basePath)) {
                    this.logger.warn(`Path traversal blocked: ${relativePath} -> ${fullPath}`);
                    return { valid: false, error: 'Path traversal detected' };
                }
                if (dir.requiresAdmin && !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
                    return { valid: false, error: 'Admin privileges required' };
                }
                if (operation === 'read' && !dir.allowRead) {
                    return { valid: false, error: 'Read not allowed for this directory' };
                }
                if (operation === 'write' && !dir.allowWrite) {
                    return { valid: false, error: 'Write not allowed for this directory' };
                }
                if (operation === 'delete' && !dir.allowDelete) {
                    return { valid: false, error: 'Delete not allowed for this directory' };
                }
                if ((operation === 'write' || operation === 'read') && dir.extensions) {
                    const ext = path.extname(fullPath);
                    if (!dir.extensions.includes(ext)) {
                        return { valid: false, error: `Extension ${ext} not allowed` };
                    }
                }
                return { valid: true, fullPath, directory: dir };
            }
        }
        return { valid: false, error: 'Path not in whitelist. Use: ' + this.allowedDirectories.map(d => d.alias).join(', ') };
    }
    async readFile(relativePath, userRole) {
        const validation = this.validatePath(relativePath, 'read', userRole);
        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }
        try {
            if (!fs.existsSync(validation.fullPath)) {
                return { success: false, message: `❌ File not found: ${relativePath}` };
            }
            const stats = fs.statSync(validation.fullPath);
            if (stats.size > 1024 * 1024) {
                return { success: false, message: '❌ File too large (max 1MB)' };
            }
            const content = fs.readFileSync(validation.fullPath, 'utf-8');
            this.logger.log(`File read: ${relativePath} by ${userRole}`);
            return {
                success: true,
                message: `📄 ${relativePath}`,
                content: content.substring(0, 50000),
            };
        }
        catch (error) {
            this.logger.error(`File read error: ${error.message}`);
            return { success: false, message: `❌ Read error: ${error.message}` };
        }
    }
    async writeFile(relativePath, content, userRole, overwrite = false) {
        const validation = this.validatePath(relativePath, 'write', userRole);
        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }
        try {
            if (fs.existsSync(validation.fullPath) && !overwrite) {
                return {
                    success: false,
                    message: `❌ File exists. Use overwrite=true to replace.`
                };
            }
            if (content.length > 500 * 1024) {
                return { success: false, message: '❌ Content too large (max 500KB)' };
            }
            if (fs.existsSync(validation.fullPath)) {
                const backupPath = validation.fullPath + '.bak.' + Date.now();
                fs.copyFileSync(validation.fullPath, backupPath);
            }
            const dir = path.dirname(validation.fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(validation.fullPath, content, 'utf-8');
            this.logger.log(`File written: ${relativePath} by ${userRole} (${content.length} bytes)`);
            return {
                success: true,
                message: `✅ Written: ${relativePath} (${content.length} bytes)`,
            };
        }
        catch (error) {
            this.logger.error(`File write error: ${error.message}`);
            return { success: false, message: `❌ Write error: ${error.message}` };
        }
    }
    async listDirectory(relativePath, userRole) {
        const validation = this.validatePath(relativePath, 'list', userRole);
        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }
        try {
            if (!fs.existsSync(validation.fullPath)) {
                return { success: false, message: `❌ Directory not found: ${relativePath}` };
            }
            const stats = fs.statSync(validation.fullPath);
            if (!stats.isDirectory()) {
                return { success: false, message: `❌ Not a directory: ${relativePath}` };
            }
            const files = fs.readdirSync(validation.fullPath);
            const filtered = files
                .filter(f => !f.startsWith('.'))
                .slice(0, 100);
            return {
                success: true,
                message: `📂 ${relativePath} (${files.length} items)`,
                files: filtered,
            };
        }
        catch (error) {
            this.logger.error(`Directory list error: ${error.message}`);
            return { success: false, message: `❌ List error: ${error.message}` };
        }
    }
    getAvailableDirectories(userRole) {
        return this.allowedDirectories
            .filter(d => !d.requiresAdmin || ['ADMIN', 'SUPER_ADMIN'].includes(userRole))
            .map(d => ({
            alias: d.alias,
            permissions: [
                d.allowRead ? 'R' : '',
                d.allowWrite ? 'W' : '',
                d.allowDelete ? 'D' : '',
            ].filter(Boolean).join(''),
        }));
    }
};
exports.SecureFileService = SecureFileService;
exports.SecureFileService = SecureFileService = SecureFileService_1 = __decorate([
    (0, common_1.Injectable)()
], SecureFileService);
//# sourceMappingURL=secure-file.service.js.map