import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { spawn, SpawnOptions } from 'child_process';

/**
 * 🔐 Secure Command Executor Service
 * Fixes: #1, #2, #3, #4 - Command Injection vulnerabilities
 * 
 * ONLY whitelisted commands can be executed.
 * NO user input is ever passed to shell.
 */

export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

interface AllowedCommand {
    name: string;
    command: string;
    args: string[];
    cwd?: string;
    timeout: number;
    requiresAdmin: boolean;
    description: string;
}

@Injectable()
export class SecureCommandService {
    private readonly logger = new Logger(SecureCommandService.name);

    // 🔒 WHITELIST OF ALLOWED COMMANDS - NOTHING ELSE CAN RUN
    private readonly allowedCommands: Map<string, AllowedCommand> = new Map([
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

    /**
     * 🚀 Execute a whitelisted command
     */
    async execute(
        commandName: string,
        userRole: string
    ): Promise<CommandResult> {
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

        // Check admin requirement
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
            const options: SpawnOptions = {
                cwd: cmd.cwd,
                timeout: cmd.timeout,
                shell: false, // NEVER use shell
            };

            const proc = spawn(cmd.command, cmd.args, options);

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            // Timeout handler
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
                    stdout: stdout.substring(0, 10000), // Limit output size
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

    /**
     * 🚀 Deploy sequence (build + restart)
     */
    async deploy(userRole: string): Promise<{
        success: boolean;
        steps: string[];
        errors: string[];
    }> {
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return {
                success: false,
                steps: [],
                errors: ['Deploy requires admin privileges'],
            };
        }

        const steps: string[] = [];
        const errors: string[] = [];

        // Step 1: Prisma generate
        const prismaResult = await this.execute('prisma_generate', userRole);
        if (prismaResult.success) {
            steps.push('✅ Prisma client generated');
        } else {
            errors.push(`⚠️ Prisma: ${prismaResult.stderr}`);
        }

        // Step 2: Build backend
        const buildResult = await this.execute('npm_build_backend', userRole);
        if (buildResult.success) {
            steps.push('✅ Backend built');
        } else {
            errors.push(`❌ Build failed: ${buildResult.stderr}`);
            return { success: false, steps, errors };
        }

        // Step 3: Restart PM2
        const restartResult = await this.execute('pm2_restart_backend', userRole);
        if (restartResult.success) {
            steps.push('✅ Backend restarted');
        } else {
            errors.push(`❌ Restart failed: ${restartResult.stderr}`);
            return { success: false, steps, errors };
        }

        return {
            success: true,
            steps,
            errors,
        };
    }

    /**
     * 📋 Get list of available commands
     */
    getAvailableCommands(userRole: string): { name: string; description: string }[] {
        const commands: { name: string; description: string }[] = [];

        for (const [name, cmd] of this.allowedCommands) {
            if (!cmd.requiresAdmin || ['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
                commands.push({ name, description: cmd.description });
            }
        }

        return commands;
    }
}
