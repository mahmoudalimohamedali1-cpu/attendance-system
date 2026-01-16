"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecureCommandService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureCommandService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let SecureCommandService = SecureCommandService_1 = class SecureCommandService {
    constructor() {
        this.logger = new common_1.Logger(SecureCommandService_1.name);
        this.allowedCommands = new Map([
            ['pm2_status', {
                    name: 'pm2_status',
                    command: 'pm2',
                    args: ['jlist'],
                    timeout: 10000,
                    requiresAdmin: true,
                    description: 'Get PM2 process status'
                }],
            ['pm2_restart_backend', {
                    name: 'pm2_restart_backend',
                    command: 'pm2',
                    args: ['restart', 'backend'],
                    timeout: 30000,
                    requiresAdmin: true,
                    description: 'Restart backend service'
                }],
            ['pm2_logs', {
                    name: 'pm2_logs',
                    command: 'pm2',
                    args: ['logs', '--lines', '50', '--nostream'],
                    timeout: 10000,
                    requiresAdmin: true,
                    description: 'Get recent PM2 logs'
                }],
            ['git_status', {
                    name: 'git_status',
                    command: 'git',
                    args: ['status', '--short'],
                    cwd: process.env.PROJECT_PATH || '/var/www/attendance-system',
                    timeout: 10000,
                    requiresAdmin: true,
                    description: 'Get git status'
                }],
            ['git_log', {
                    name: 'git_log',
                    command: 'git',
                    args: ['log', '--oneline', '-10'],
                    cwd: process.env.PROJECT_PATH || '/var/www/attendance-system',
                    timeout: 10000,
                    requiresAdmin: true,
                    description: 'Get recent git commits'
                }],
            ['npm_build_backend', {
                    name: 'npm_build_backend',
                    command: 'npm',
                    args: ['run', 'build'],
                    cwd: process.env.BACKEND_PATH || '/var/www/attendance-system/backend',
                    timeout: 120000,
                    requiresAdmin: true,
                    description: 'Build backend'
                }],
            ['npm_build_frontend', {
                    name: 'npm_build_frontend',
                    command: 'npm',
                    args: ['run', 'build'],
                    cwd: process.env.FRONTEND_PATH || '/var/www/attendance-system/web-admin',
                    timeout: 180000,
                    requiresAdmin: true,
                    description: 'Build frontend'
                }],
            ['prisma_generate', {
                    name: 'prisma_generate',
                    command: 'npx',
                    args: ['prisma', 'generate'],
                    cwd: process.env.BACKEND_PATH || '/var/www/attendance-system/backend',
                    timeout: 60000,
                    requiresAdmin: true,
                    description: 'Generate Prisma client'
                }],
            ['system_info', {
                    name: 'system_info',
                    command: 'node',
                    args: ['-e', 'console.log(JSON.stringify({uptime:require("os").uptime(),freemem:require("os").freemem(),totalmem:require("os").totalmem(),loadavg:require("os").loadavg()}))'],
                    timeout: 5000,
                    requiresAdmin: false,
                    description: 'Get system info'
                }],
            ['disk_usage', {
                    name: 'disk_usage',
                    command: 'df',
                    args: ['-h', '/'],
                    timeout: 5000,
                    requiresAdmin: true,
                    description: 'Check disk usage'
                }],
        ]);
    }
    async execute(commandName, userRole) {
        const cmd = this.allowedCommands.get(commandName);
        if (!cmd) {
            this.logger.warn(`Blocked unknown command: ${commandName}`);
            return {
                success: false,
                stdout: '',
                stderr: `Command "${commandName}" is not allowed`,
                exitCode: 1,
            };
        }
        if (cmd.requiresAdmin && !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            this.logger.warn(`Blocked non-admin command attempt: ${commandName} by ${userRole}`);
            return {
                success: false,
                stdout: '',
                stderr: 'This command requires admin privileges',
                exitCode: 1,
            };
        }
        this.logger.log(`Executing whitelisted command: ${commandName}`);
        return new Promise((resolve) => {
            const options = {
                cwd: cmd.cwd,
                timeout: cmd.timeout,
                shell: false,
            };
            const proc = (0, child_process_1.spawn)(cmd.command, cmd.args, options);
            let stdout = '';
            let stderr = '';
            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            const timeout = setTimeout(() => {
                proc.kill('SIGTERM');
                resolve({
                    success: false,
                    stdout,
                    stderr: 'Command timed out',
                    exitCode: -1,
                });
            }, cmd.timeout);
            proc.on('close', (code) => {
                clearTimeout(timeout);
                resolve({
                    success: code === 0,
                    stdout: stdout.substring(0, 10000),
                    stderr: stderr.substring(0, 2000),
                    exitCode: code,
                });
            });
            proc.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    stdout: '',
                    stderr: err.message,
                    exitCode: -1,
                });
            });
        });
    }
    async deploy(userRole) {
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return {
                success: false,
                steps: [],
                errors: ['Deploy requires admin privileges'],
            };
        }
        const steps = [];
        const errors = [];
        const prismaResult = await this.execute('prisma_generate', userRole);
        if (prismaResult.success) {
            steps.push('✅ Prisma client generated');
        }
        else {
            errors.push(`⚠️ Prisma: ${prismaResult.stderr}`);
        }
        const buildResult = await this.execute('npm_build_backend', userRole);
        if (buildResult.success) {
            steps.push('✅ Backend built');
        }
        else {
            errors.push(`❌ Build failed: ${buildResult.stderr}`);
            return { success: false, steps, errors };
        }
        const restartResult = await this.execute('pm2_restart_backend', userRole);
        if (restartResult.success) {
            steps.push('✅ Backend restarted');
        }
        else {
            errors.push(`❌ Restart failed: ${restartResult.stderr}`);
            return { success: false, steps, errors };
        }
        return {
            success: true,
            steps,
            errors,
        };
    }
    getAvailableCommands(userRole) {
        const commands = [];
        for (const [name, cmd] of this.allowedCommands) {
            if (!cmd.requiresAdmin || ['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
                commands.push({ name, description: cmd.description });
            }
        }
        return commands;
    }
};
exports.SecureCommandService = SecureCommandService;
exports.SecureCommandService = SecureCommandService = SecureCommandService_1 = __decorate([
    (0, common_1.Injectable)()
], SecureCommandService);
//# sourceMappingURL=secure-command.service.js.map