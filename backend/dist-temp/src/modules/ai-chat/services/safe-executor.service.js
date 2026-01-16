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
var SafeExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeExecutorService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
let SafeExecutorService = SafeExecutorService_1 = class SafeExecutorService {
    constructor() {
        this.logger = new common_1.Logger(SafeExecutorService_1.name);
        this.allowedCommands = new Map([
            ['build_backend', {
                    name: 'build_backend',
                    command: 'npm',
                    args: ['run', 'build'],
                    cwd: process.env.BACKEND_PATH || '/var/www/attendance-system/backend',
                    timeout: 120000,
                    description: 'Build backend TypeScript',
                }],
            ['build_frontend', {
                    name: 'build_frontend',
                    command: 'npm',
                    args: ['run', 'build'],
                    cwd: process.env.FRONTEND_PATH || '/var/www/attendance-system/web-admin',
                    timeout: 180000,
                    description: 'Build frontend React',
                }],
            ['pm2_restart', {
                    name: 'pm2_restart',
                    command: 'pm2',
                    args: ['restart', '0'],
                    timeout: 30000,
                    description: 'Restart PM2 process',
                }],
            ['pm2_status', {
                    name: 'pm2_status',
                    command: 'pm2',
                    args: ['jlist'],
                    timeout: 10000,
                    description: 'Get PM2 status as JSON',
                }],
            ['pm2_logs', {
                    name: 'pm2_logs',
                    command: 'pm2',
                    args: ['logs', '0', '--lines', '50', '--nostream'],
                    timeout: 10000,
                    description: 'Get last 50 PM2 logs',
                }],
            ['git_status', {
                    name: 'git_status',
                    command: 'git',
                    args: ['status', '--short'],
                    cwd: process.env.PROJECT_PATH || '/var/www/attendance-system',
                    timeout: 10000,
                    description: 'Git status',
                }],
            ['git_log', {
                    name: 'git_log',
                    command: 'git',
                    args: ['log', '--oneline', '-10'],
                    cwd: process.env.PROJECT_PATH || '/var/www/attendance-system',
                    timeout: 10000,
                    description: 'Last 10 git commits',
                }],
            ['prisma_migrate', {
                    name: 'prisma_migrate',
                    command: 'npx',
                    args: ['prisma', 'db', 'push'],
                    cwd: process.env.BACKEND_PATH || '/var/www/attendance-system/backend',
                    timeout: 60000,
                    description: 'Apply Prisma schema',
                }],
            ['system_info', {
                    name: 'system_info',
                    command: 'node',
                    args: ['-e', 'console.log(JSON.stringify({uptime:require("os").uptime(),freemem:require("os").freemem(),totalmem:require("os").totalmem(),cpus:require("os").cpus().length}))'],
                    timeout: 5000,
                    description: 'System information',
                }],
            ['disk_space', {
                    name: 'disk_space',
                    command: 'df',
                    args: ['-h', '/'],
                    timeout: 5000,
                    description: 'Disk space usage',
                }],
        ]);
    }
    async execute(commandName) {
        const command = this.allowedCommands.get(commandName);
        if (!command) {
            this.logger.warn(`Blocked attempt to execute unknown command: ${commandName}`);
            return {
                success: false,
                stdout: '',
                stderr: `Command "${commandName}" is not allowed`,
                code: -1,
            };
        }
        this.logger.log(`Executing: ${command.name} - ${command.description}`);
        return this.spawnCommand(command.command, command.args, command.cwd, command.timeout);
    }
    spawnCommand(command, args, cwd, timeout) {
        return new Promise((resolve) => {
            const options = {
                cwd: cwd || process.cwd(),
                env: { ...process.env, PATH: process.env.PATH },
            };
            const child = (0, child_process_1.spawn)(command, args, options);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timer = timeout
                ? setTimeout(() => {
                    timedOut = true;
                    child.kill('SIGTERM');
                }, timeout)
                : null;
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('error', (error) => {
                if (timer)
                    clearTimeout(timer);
                this.logger.error(`Command error: ${error.message}`);
                resolve({
                    success: false,
                    stdout,
                    stderr: error.message,
                    code: -1,
                });
            });
            child.on('close', (code) => {
                if (timer)
                    clearTimeout(timer);
                if (timedOut) {
                    resolve({
                        success: false,
                        stdout,
                        stderr: 'Command timed out',
                        code: -1,
                    });
                    return;
                }
                resolve({
                    success: code === 0,
                    stdout,
                    stderr,
                    code: code ?? 0,
                });
            });
        });
    }
    getAvailableCommands() {
        return Array.from(this.allowedCommands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description,
        }));
    }
    isCommandAllowed(name) {
        return this.allowedCommands.has(name);
    }
    async deploy() {
        const steps = [];
        const buildBackend = await this.execute('build_backend');
        steps.push(buildBackend.success ? '✅ Backend built' : `❌ Backend build failed: ${buildBackend.stderr}`);
        if (!buildBackend.success) {
            return { success: false, steps };
        }
        const restart = await this.execute('pm2_restart');
        steps.push(restart.success ? '✅ PM2 restarted' : `❌ PM2 restart failed: ${restart.stderr}`);
        if (!restart.success) {
            return { success: false, steps };
        }
        const buildFrontend = await this.execute('build_frontend');
        steps.push(buildFrontend.success ? '✅ Frontend built' : `⚠️ Frontend build: ${buildFrontend.stderr.substring(0, 100)}`);
        return { success: true, steps };
    }
};
exports.SafeExecutorService = SafeExecutorService;
exports.SafeExecutorService = SafeExecutorService = SafeExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SafeExecutorService);
//# sourceMappingURL=safe-executor.service.js.map