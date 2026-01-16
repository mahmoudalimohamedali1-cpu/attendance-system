import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 🔐 Secure File Service
 * Fixes: #5, #6, #7, #8, #9 - File system vulnerabilities
 * 
 * ONLY whitelisted directories can be accessed.
 * Path traversal attacks are blocked.
 * File operations are logged.
 */

export interface FileResult {
    success: boolean;
    message: string;
    content?: string;
    files?: string[];
}

interface DirectoryWhitelist {
    alias: string;
    basePath: string;
    allowRead: boolean;
    allowWrite: boolean;
    allowDelete: boolean;
    extensions?: string[];
    requiresAdmin: boolean;
}

@Injectable()
export class SecureFileService {
    private readonly logger = new Logger(SecureFileService.name);

    // 🔒 WHITELISTED DIRECTORIES - NOTHING ELSE CAN BE ACCESSED
    private readonly allowedDirectories: DirectoryWhitelist[] = [
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
            allowWrite: false, // Schema should be manually edited
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

    // Dangerous patterns to block
    private readonly blockedPatterns = [
        /\.\./,           // Path traversal
        /~\//,            // Home directory
        /\/etc\//,        // System config
        /\/proc\//,       // Process info
        /\/dev\//,        // Devices
        /node_modules/,   // Dependencies
        /\.env/,          // Environment files
        /\.git\//,        // Git internals
        /password/i,      // Password files
        /secret/i,        // Secret files
        /private/i,       // Private keys
    ];

    /**
     * 🔍 Validate and resolve a file path
     */
    private validatePath(
        relativePath: string,
        operation: 'read' | 'write' | 'delete' | 'list',
        userRole: string
    ): { valid: boolean; fullPath?: string; error?: string; directory?: DirectoryWhitelist } {
        // Block dangerous patterns
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(relativePath)) {
                this.logger.warn(`Blocked dangerous path pattern: ${relativePath}`);
                return { valid: false, error: 'Path contains blocked pattern' };
            }
        }

        // Find matching whitelisted directory
        for (const dir of this.allowedDirectories) {
            // Check if path starts with alias
            if (relativePath.startsWith(dir.alias + '/') || relativePath.startsWith(dir.alias + '\\')) {
                const subPath = relativePath.substring(dir.alias.length + 1);
                const fullPath = path.resolve(dir.basePath, subPath);

                // CRITICAL: Ensure resolved path is still within base path
                if (!fullPath.startsWith(dir.basePath)) {
                    this.logger.warn(`Path traversal blocked: ${relativePath} -> ${fullPath}`);
                    return { valid: false, error: 'Path traversal detected' };
                }

                // Check permissions
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

                // Check extension for write/read operations
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

    /**
     * 📖 Read file securely
     */
    async readFile(relativePath: string, userRole: string): Promise<FileResult> {
        const validation = this.validatePath(relativePath, 'read', userRole);

        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }

        try {
            if (!fs.existsSync(validation.fullPath!)) {
                return { success: false, message: `❌ File not found: ${relativePath}` };
            }

            const stats = fs.statSync(validation.fullPath!);
            if (stats.size > 1024 * 1024) { // 1MB limit
                return { success: false, message: '❌ File too large (max 1MB)' };
            }

            const content = fs.readFileSync(validation.fullPath!, 'utf-8');

            this.logger.log(`File read: ${relativePath} by ${userRole}`);

            return {
                success: true,
                message: `📄 ${relativePath}`,
                content: content.substring(0, 50000), // Limit output
            };
        } catch (error: any) {
            this.logger.error(`File read error: ${error.message}`);
            return { success: false, message: `❌ Read error: ${error.message}` };
        }
    }

    /**
     * ✏️ Write file securely
     */
    async writeFile(
        relativePath: string,
        content: string,
        userRole: string,
        overwrite: boolean = false
    ): Promise<FileResult> {
        const validation = this.validatePath(relativePath, 'write', userRole);

        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }

        try {
            // Check if file exists
            if (fs.existsSync(validation.fullPath!) && !overwrite) {
                return {
                    success: false,
                    message: `❌ File exists. Use overwrite=true to replace.`
                };
            }

            // Validate content size
            if (content.length > 500 * 1024) { // 500KB limit
                return { success: false, message: '❌ Content too large (max 500KB)' };
            }

            // Create backup if overwriting
            if (fs.existsSync(validation.fullPath!)) {
                const backupPath = validation.fullPath! + '.bak.' + Date.now();
                fs.copyFileSync(validation.fullPath!, backupPath);
            }

            // Create directory if needed
            const dir = path.dirname(validation.fullPath!);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(validation.fullPath!, content, 'utf-8');

            this.logger.log(`File written: ${relativePath} by ${userRole} (${content.length} bytes)`);

            return {
                success: true,
                message: `✅ Written: ${relativePath} (${content.length} bytes)`,
            };
        } catch (error: any) {
            this.logger.error(`File write error: ${error.message}`);
            return { success: false, message: `❌ Write error: ${error.message}` };
        }
    }

    /**
     * 📂 List directory securely
     */
    async listDirectory(relativePath: string, userRole: string): Promise<FileResult> {
        const validation = this.validatePath(relativePath, 'list', userRole);

        if (!validation.valid) {
            return { success: false, message: `❌ ${validation.error}` };
        }

        try {
            if (!fs.existsSync(validation.fullPath!)) {
                return { success: false, message: `❌ Directory not found: ${relativePath}` };
            }

            const stats = fs.statSync(validation.fullPath!);
            if (!stats.isDirectory()) {
                return { success: false, message: `❌ Not a directory: ${relativePath}` };
            }

            const files = fs.readdirSync(validation.fullPath!);

            // Limit and filter results
            const filtered = files
                .filter(f => !f.startsWith('.'))
                .slice(0, 100);

            return {
                success: true,
                message: `📂 ${relativePath} (${files.length} items)`,
                files: filtered,
            };
        } catch (error: any) {
            this.logger.error(`Directory list error: ${error.message}`);
            return { success: false, message: `❌ List error: ${error.message}` };
        }
    }

    /**
     * 📋 Get available directory aliases
     */
    getAvailableDirectories(userRole: string): { alias: string; permissions: string }[] {
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
}
