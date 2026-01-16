export interface FileResult {
    success: boolean;
    message: string;
    content?: string;
    files?: string[];
}
export declare class SecureFileService {
    private readonly logger;
    private readonly allowedDirectories;
    private readonly blockedPatterns;
    private validatePath;
    readFile(relativePath: string, userRole: string): Promise<FileResult>;
    writeFile(relativePath: string, content: string, userRole: string, overwrite?: boolean): Promise<FileResult>;
    listDirectory(relativePath: string, userRole: string): Promise<FileResult>;
    getAvailableDirectories(userRole: string): {
        alias: string;
        permissions: string;
    }[];
}
