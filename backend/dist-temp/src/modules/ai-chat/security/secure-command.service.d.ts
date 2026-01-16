export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
}
export declare class SecureCommandService {
    private readonly logger;
    private readonly allowedCommands;
    execute(commandName: string, userRole: string): Promise<CommandResult>;
    deploy(userRole: string): Promise<{
        success: boolean;
        steps: string[];
        errors: string[];
    }>;
    getAvailableCommands(userRole: string): {
        name: string;
        description: string;
    }[];
}
