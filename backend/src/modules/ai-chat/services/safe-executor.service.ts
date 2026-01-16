import { Injectable, Logger } from '@nestjs/common';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as path from 'path';

/**
 * 🛡️ Safe Command Executor Service
 * Prevents command injection by using spawn with args array
 */

export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    code: number;
}

export interface AllowedCommand {
    name: string;
    command: string;
    args: string[];
    cwd?: string;
    timeout?: number;
    description: string;
}

@Injectable()
export class SafeExecutorService {
    private readonly logger = new Logger(SafeExecutorService.name);

    // Whitelist of allowed commands with fixed arguments
    private readonly allowedCommands: Map<string, AllowedCommand> = new Map([
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

    constructor() { }

    /**
     * 🚀 Execute a whitelisted command safely
     */
    async execute(commandName: string): Promise<CommandResult> {
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

        return this.spawnCommand(
            command.command,
            command.args,
            command.cwd,
            command.timeout
        );
    }

    /**
     * 🔧 Spawn a command safely (no shell)
     */
    private spawnCommand(
        command: string,
        args: string[],
        cwd?: string,
        timeout?: number
    ): Promise<CommandResult> {
        return new Promise((resolve) => {
            const options: SpawnOptionsWithoutStdio = {
                cwd: cwd || process.cwd(),
                env: { ...process.env, PATH: process.env.PATH },
            };

            const child = spawn(command, args, options);

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            // Set timeout
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
                if (timer) clearTimeout(timer);
                this.logger.error(`Command error: ${error.message}`);
                resolve({
                    success: false,
                    stdout,
                    stderr: error.message,
                    code: -1,
                });
            });

            child.on('close', (code) => {
                if (timer) clearTimeout(timer);

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

    /**
     * 📋 Get list of available commands
     */
    getAvailableCommands(): { name: string; description: string }[] {
        return Array.from(this.allowedCommands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description,
        }));
    }

    /**
     * ✅ Check if command is allowed
     */
    isCommandAllowed(name: string): boolean {
        return this.allowedCommands.has(name);
    }

    /**
     * 🔒 Execute deployment sequence
     */
    async deploy(): Promise<{ success: boolean; steps: string[] }> {
        const steps: string[] = [];

        // Step 1: Build backend
        const buildBackend = await this.execute('build_backend');
        steps.push(buildBackend.success ? '✅ Backend built' : `❌ Backend build failed: ${buildBackend.stderr}`);

        if (!buildBackend.success) {
            return { success: false, steps };
        }

        // Step 2: Restart PM2
        const restart = await this.execute('pm2_restart');
        steps.push(restart.success ? '✅ PM2 restarted' : `❌ PM2 restart failed: ${restart.stderr}`);

        if (!restart.success) {
            return { success: false, steps };
        }

        // Step 3: Build frontend (optional, don't fail if errors)
        const buildFrontend = await this.execute('build_frontend');
        steps.push(buildFrontend.success ? '✅ Frontend built' : `⚠️ Frontend build: ${buildFrontend.stderr.substring(0, 100)}`);

        return { success: true, steps };
    }
}
