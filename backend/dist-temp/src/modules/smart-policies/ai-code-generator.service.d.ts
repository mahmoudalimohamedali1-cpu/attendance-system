export declare class AiCodeGeneratorService {
    private readonly logger;
    private readonly srcPath;
    generateService(modelName: string, fields: string[]): string;
    generateController(modelName: string): string;
    generateModule(modelName: string): string;
    createModuleFiles(modelName: string, fields: string[]): Promise<{
        success: boolean;
        createdFiles: string[];
        message: string;
    }>;
    updateAppModule(modelName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    createAndRegisterModule(modelName: string, fields: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    private toKebabCase;
    private toCamelCase;
    private readonly frontendPath;
    generateFrontendService(modelName: string): string;
    generateFrontendPage(modelName: string, fields: string[]): string;
    createFrontendFiles(modelName: string, fields: string[]): Promise<{
        success: boolean;
        createdFiles: string[];
        message: string;
    }>;
    updateFrontendRouter(modelName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    createFullStack(modelName: string, fields: string[]): Promise<{
        success: boolean;
        message: string;
        backend: {
            success: boolean;
            message: string;
        };
        frontend: {
            success: boolean;
            message: string;
        };
        rebuild: {
            backend: boolean;
            frontend: boolean;
        };
    }>;
    private getArabicTitle;
    rebuildBackend(): Promise<{
        success: boolean;
        message: string;
    }>;
    updateSidebar(modelName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    rebuildFrontend(): Promise<{
        success: boolean;
        message: string;
    }>;
}
