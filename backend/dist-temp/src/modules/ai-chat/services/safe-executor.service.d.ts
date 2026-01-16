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
export declare class SafeExecutorService {
    private readonly logger;
    private readonly allowedCommands;
    constructor();
    execute(commandName: string): Promise<CommandResult>;
    private spawnCommand;
    getAvailableCommands(): {
        name: string;
        description: string;
    }[];
    isCommandAllowed(name: string): boolean;
    deploy(): Promise<{
        success: boolean;
        steps: string[];
    }>;
}
