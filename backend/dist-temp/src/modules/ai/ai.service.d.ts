export declare class AiService {
    private readonly logger;
    private anthropic;
    private readonly models;
    constructor();
    isAvailable(): boolean;
    generateContent(prompt: string, systemInstruction?: string): Promise<string>;
    parseJsonResponse<T>(response: string | undefined | null): T;
    private findJsonEnd;
    private repairIncompleteJson;
}
