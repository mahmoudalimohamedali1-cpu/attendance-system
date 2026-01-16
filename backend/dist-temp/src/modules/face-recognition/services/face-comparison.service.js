"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FaceComparisonService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceComparisonService = void 0;
const common_1 = require("@nestjs/common");
let FaceComparisonService = FaceComparisonService_1 = class FaceComparisonService {
    constructor() {
        this.logger = new common_1.Logger(FaceComparisonService_1.name);
        this.DEFAULT_THRESHOLD = 0.6;
        this.MAX_EUCLIDEAN_DISTANCE = 0.6;
    }
    compareFaces(embedding1, embedding2, threshold = this.DEFAULT_THRESHOLD) {
        try {
            if (!this.validateEmbeddings(embedding1, embedding2)) {
                return {
                    isMatch: false,
                    confidence: 0,
                    distance: 999,
                    threshold,
                    error: 'بيانات الوجه غير صالحة',
                };
            }
            const euclideanDistance = this.calculateEuclideanDistance(embedding1, embedding2);
            const cosineSimilarity = this.calculateCosineSimilarity(embedding1, embedding2);
            const confidence = this.calculateConfidence(euclideanDistance, cosineSimilarity);
            const isMatch = confidence >= threshold && euclideanDistance <= this.MAX_EUCLIDEAN_DISTANCE;
            this.logger.debug(`Face comparison: distance=${euclideanDistance.toFixed(4)}, ` +
                `similarity=${cosineSimilarity.toFixed(4)}, ` +
                `confidence=${confidence.toFixed(4)}, ` +
                `threshold=${threshold}, isMatch=${isMatch}`);
            return {
                isMatch,
                confidence,
                distance: euclideanDistance,
                similarity: cosineSimilarity,
                threshold,
            };
        }
        catch (error) {
            this.logger.error('Error comparing faces:', error);
            return {
                isMatch: false,
                confidence: 0,
                distance: 999,
                threshold,
                error: 'حدث خطأ أثناء مقارنة الوجوه',
            };
        }
    }
    calculateEuclideanDistance(vec1, vec2) {
        let sum = 0;
        for (let i = 0; i < vec1.length; i++) {
            const diff = vec1[i] - vec2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
    calculateCosineSimilarity(vec1, vec2) {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (denominator === 0)
            return 0;
        return dotProduct / denominator;
    }
    calculateConfidence(euclideanDistance, cosineSimilarity) {
        const distanceScore = Math.max(0, 1 - (euclideanDistance / 2.0));
        const similarityScore = (cosineSimilarity + 1) / 2;
        const confidence = (distanceScore * 0.6) + (similarityScore * 0.4);
        return Math.min(1, Math.max(0, confidence));
    }
    validateEmbeddings(embedding1, embedding2) {
        if (!embedding1 || !embedding2)
            return false;
        if (!Array.isArray(embedding1) || !Array.isArray(embedding2))
            return false;
        if (embedding1.length !== embedding2.length)
            return false;
        if (embedding1.length < 64 || embedding1.length > 1024)
            return false;
        const isValid = (arr) => arr.every(v => typeof v === 'number' && !isNaN(v));
        if (!isValid(embedding1) || !isValid(embedding2))
            return false;
        return true;
    }
    validateEmbeddingQuality(embedding) {
        if (!embedding || !Array.isArray(embedding) || embedding.length < 64) {
            return {
                isValid: false,
                quality: 0,
                message: 'بيانات الوجه غير صالحة',
            };
        }
        const variance = this.calculateVariance(embedding);
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (magnitude < 0.1) {
            return {
                isValid: false,
                quality: 0,
                message: 'صورة الوجه غير واضحة',
            };
        }
        const quality = Math.min(1, (variance * 10) * (magnitude / 10));
        return {
            isValid: quality >= 0.3,
            quality,
            variance,
            magnitude,
            message: quality >= 0.3 ? 'جودة مقبولة' : 'جودة الصورة منخفضة، يرجى التقاط صورة أوضح',
        };
    }
    calculateVariance(arr) {
        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
        const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((sum, v) => sum + v, 0) / arr.length;
    }
    getRecommendedThreshold() {
        return this.DEFAULT_THRESHOLD;
    }
};
exports.FaceComparisonService = FaceComparisonService;
exports.FaceComparisonService = FaceComparisonService = FaceComparisonService_1 = __decorate([
    (0, common_1.Injectable)()
], FaceComparisonService);
//# sourceMappingURL=face-comparison.service.js.map