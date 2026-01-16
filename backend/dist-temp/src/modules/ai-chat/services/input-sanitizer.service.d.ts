export declare class InputSanitizerService {
    private readonly logger;
    private readonly BLOCKED_PATTERNS;
    private readonly MAX_MESSAGE_LENGTH;
    constructor();
    sanitize(message: string): {
        safe: boolean;
        sanitized: string;
        warnings: string[];
    };
    validateFilePath(path: string, allowedPaths: string[]): boolean;
    hashForLog(data: string): string;
    escapeHtml(text: string): string;
    extractParameters(message: string, allowedKeys: string[]): Record<string, string>;
    isValidRequest(message: string): boolean;
    getBlockedPatternsCount(): number;
}
