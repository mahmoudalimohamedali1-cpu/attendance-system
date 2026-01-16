export declare class FaceComparisonService {
    private readonly logger;
    private readonly DEFAULT_THRESHOLD;
    private readonly MAX_EUCLIDEAN_DISTANCE;
    compareFaces(embedding1: number[], embedding2: number[], threshold?: number): FaceComparisonResult;
    private calculateEuclideanDistance;
    private calculateCosineSimilarity;
    private calculateConfidence;
    private validateEmbeddings;
    validateEmbeddingQuality(embedding: number[]): EmbeddingQualityResult;
    private calculateVariance;
    getRecommendedThreshold(): number;
}
export interface FaceComparisonResult {
    isMatch: boolean;
    confidence: number;
    distance: number;
    similarity?: number;
    threshold: number;
    error?: string;
}
export interface EmbeddingQualityResult {
    isValid: boolean;
    quality: number;
    variance?: number;
    magnitude?: number;
    message: string;
}
