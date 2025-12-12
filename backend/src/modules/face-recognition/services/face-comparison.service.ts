import { Injectable, Logger } from '@nestjs/common';

/**
 * خدمة مقارنة الوجوه
 * تستخدم لمقارنة Face Embeddings بين الوجه المسجل والوجه الحالي
 * 
 * Face Embedding: مصفوفة من 128-512 رقم عشري تمثل ملامح الوجه
 * يتم إنشاؤها من التطبيق باستخدام ML Kit أو TensorFlow Lite
 */
@Injectable()
export class FaceComparisonService {
  private readonly logger = new Logger(FaceComparisonService.name);
  
  // الحد الأدنى للتطابق (0.0 - 1.0)
  // كلما زاد الرقم كلما كان التطابق أكثر صرامة
  private readonly DEFAULT_THRESHOLD = 0.6;
  
  // الحد الأقصى للمسافة الإقليدية المقبولة
  private readonly MAX_EUCLIDEAN_DISTANCE = 0.6;

  /**
   * مقارنة وجهين باستخدام Face Embeddings
   * @param embedding1 - Face Embedding الأول (المسجل)
   * @param embedding2 - Face Embedding الثاني (الحالي)
   * @param threshold - حد التطابق المطلوب (اختياري)
   * @returns نتيجة المقارنة
   */
  compareFaces(
    embedding1: number[],
    embedding2: number[],
    threshold: number = this.DEFAULT_THRESHOLD,
  ): FaceComparisonResult {
    try {
      // التحقق من صحة البيانات
      if (!this.validateEmbeddings(embedding1, embedding2)) {
        return {
          isMatch: false,
          confidence: 0,
          distance: 999,
          threshold,
          error: 'بيانات الوجه غير صالحة',
        };
      }

      // حساب المسافة الإقليدية بين الوجهين
      const euclideanDistance = this.calculateEuclideanDistance(embedding1, embedding2);
      
      // حساب التشابه بالكوساين
      const cosineSimilarity = this.calculateCosineSimilarity(embedding1, embedding2);
      
      // حساب نسبة الثقة (0-1)
      const confidence = this.calculateConfidence(euclideanDistance, cosineSimilarity);
      
      // تحديد ما إذا كان هناك تطابق
      const isMatch = confidence >= threshold && euclideanDistance <= this.MAX_EUCLIDEAN_DISTANCE;

      this.logger.debug(
        `Face comparison: distance=${euclideanDistance.toFixed(4)}, ` +
        `similarity=${cosineSimilarity.toFixed(4)}, ` +
        `confidence=${confidence.toFixed(4)}, ` +
        `threshold=${threshold}, isMatch=${isMatch}`,
      );

      return {
        isMatch,
        confidence,
        distance: euclideanDistance,
        similarity: cosineSimilarity,
        threshold,
      };
    } catch (error) {
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

  /**
   * حساب المسافة الإقليدية بين متجهين
   * المسافة الأقل تعني تشابه أكبر
   */
  private calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * حساب التشابه بالكوساين بين متجهين
   * القيمة 1 تعني تطابق تام، 0 تعني لا يوجد تشابه
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * حساب نسبة الثقة النهائية
   * تجمع بين المسافة الإقليدية وتشابه الكوساين
   */
  private calculateConfidence(euclideanDistance: number, cosineSimilarity: number): number {
    // تحويل المسافة الإقليدية إلى نسبة (المسافة الأقل = ثقة أعلى)
    // نفترض أن المسافة القصوى المعقولة هي 2.0
    const distanceScore = Math.max(0, 1 - (euclideanDistance / 2.0));
    
    // تحويل تشابه الكوساين إلى نسبة (قد يكون سالبًا)
    const similarityScore = (cosineSimilarity + 1) / 2;
    
    // الجمع بين الدرجتين مع ترجيح
    const confidence = (distanceScore * 0.6) + (similarityScore * 0.4);
    
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * التحقق من صحة Face Embeddings
   */
  private validateEmbeddings(embedding1: number[], embedding2: number[]): boolean {
    // التحقق من وجود البيانات
    if (!embedding1 || !embedding2) return false;
    
    // التحقق من أنها مصفوفات
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) return false;
    
    // التحقق من أن لها نفس الطول
    if (embedding1.length !== embedding2.length) return false;
    
    // التحقق من أن الطول معقول (عادة 128 أو 512)
    if (embedding1.length < 64 || embedding1.length > 1024) return false;
    
    // التحقق من أن جميع القيم أرقام
    const isValid = (arr: number[]) => arr.every(v => typeof v === 'number' && !isNaN(v));
    if (!isValid(embedding1) || !isValid(embedding2)) return false;
    
    return true;
  }

  /**
   * التحقق من جودة Face Embedding
   * يستخدم للتأكد من أن الصورة الملتقطة ذات جودة كافية
   */
  validateEmbeddingQuality(embedding: number[]): EmbeddingQualityResult {
    if (!embedding || !Array.isArray(embedding) || embedding.length < 64) {
      return {
        isValid: false,
        quality: 0,
        message: 'بيانات الوجه غير صالحة',
      };
    }

    // حساب معايير الجودة
    const variance = this.calculateVariance(embedding);
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    
    // التحقق من أن المتجه ليس صفرًا أو منخفضًا جدًا
    if (magnitude < 0.1) {
      return {
        isValid: false,
        quality: 0,
        message: 'صورة الوجه غير واضحة',
      };
    }

    // حساب جودة الصورة بناءً على التباين والحجم
    const quality = Math.min(1, (variance * 10) * (magnitude / 10));

    return {
      isValid: quality >= 0.3,
      quality,
      variance,
      magnitude,
      message: quality >= 0.3 ? 'جودة مقبولة' : 'جودة الصورة منخفضة، يرجى التقاط صورة أوضح',
    };
  }

  /**
   * حساب التباين لمصفوفة
   */
  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / arr.length;
  }

  /**
   * الحصول على الحد الأدنى الموصى به للثقة
   */
  getRecommendedThreshold(): number {
    return this.DEFAULT_THRESHOLD;
  }
}

/**
 * نتيجة مقارنة الوجوه
 */
export interface FaceComparisonResult {
  isMatch: boolean;
  confidence: number;
  distance: number;
  similarity?: number;
  threshold: number;
  error?: string;
}

/**
 * نتيجة فحص جودة Face Embedding
 */
export interface EmbeddingQualityResult {
  isValid: boolean;
  quality: number;
  variance?: number;
  magnitude?: number;
  message: string;
}

