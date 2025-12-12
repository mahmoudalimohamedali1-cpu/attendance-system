import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:image/image.dart' as img;
import 'package:logger/logger.dart';
import '../config/app_config.dart';

/// خدمة FaceNet للتعرف على الوجه باستخدام Server-side Processing
/// تتصل بخدمة Python للتعرف على الوجه
class FaceNetService {
  static final FaceNetService _instance = FaceNetService._internal();
  factory FaceNetService() => _instance;
  FaceNetService._internal();

  final Logger _logger = Logger();
  
  // عنوان خدمة التعرف على الوجه
  String get _baseUrl => AppConfig.faceRecognitionUrl;
  
  // إعدادات
  static const int _embeddingSize = 512; // حجم الـ embedding من Facenet512 model
  static const double _matchThreshold = 0.6;

  /// إنشاء Dio client جديد في كل مرة لتجنب مشاكل الاتصال
  Dio _createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 120),
      receiveTimeout: const Duration(seconds: 300),
      sendTimeout: const Duration(seconds: 120),
      headers: {
        'Content-Type': 'application/json',
      },
    ));
    return dio;
  }

  /// تهيئة الخدمة
  Future<void> initialize() async {
    try {
      final dio = _createDio();
      final response = await dio.get('/health');
      if (response.statusCode == 200) {
        _logger.i('FaceNet Service connected to $_baseUrl');
      }
    } catch (e) {
      _logger.e('Error connecting to FaceNet Service: $e');
    }
  }

  /// تحويل الصورة إلى Base64
  String _imageToBase64(img.Image image) {
    final bytes = img.encodeJpg(image, quality: 85);
    return base64Encode(bytes);
  }
  
  String _bytesToBase64(Uint8List bytes) {
    return base64Encode(bytes);
  }
  
  String _fileToBase64(File file) {
    final bytes = file.readAsBytesSync();
    
    // تصغير الصورة إذا كانت كبيرة جداً لتسريع الإرسال
    final image = img.decodeImage(bytes);
    if (image != null && (image.width > 800 || image.height > 800)) {
      // تصغير الصورة مع الحفاظ على النسبة
      final resized = img.copyResize(
        image,
        width: image.width > image.height ? 800 : null,
        height: image.height >= image.width ? 800 : null,
      );
      final compressedBytes = img.encodeJpg(resized, quality: 85);
      _logger.i('📐 Image resized: ${image.width}x${image.height} → ${resized.width}x${resized.height}');
      return base64Encode(compressedBytes);
    }
    
    return base64Encode(bytes);
  }

  /// استخراج Face Embedding من صورة
  Future<List<double>?> getEmbedding(File imageFile) async {
    try {
      _logger.i('📤 Sending image to face recognition service at $_baseUrl');
      _logger.i('📁 Image file size: ${imageFile.lengthSync()} bytes');
      
      final base64Image = _fileToBase64(imageFile);
      _logger.i('📦 Base64 image length: ${base64Image.length}');
      
      // إنشاء Dio client جديد لكل طلب
      final dio = _createDio();
      final response = await dio.post('/api/face/detect', data: {
        'image': base64Image,
      });
      
      _logger.i('📥 Response status: ${response.statusCode}');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        final embedding = List<double>.from(response.data['embedding']);
        _logger.i('✅ Face embedding extracted successfully (${embedding.length} dimensions)');
        return embedding;
      } else {
        _logger.w('❌ Face detection failed: ${response.data['error']}');
        return null;
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout) {
        _logger.e('⏱️ Connection timeout to $_baseUrl');
      } else if (e.type == DioExceptionType.connectionError) {
        _logger.e('🔌 Cannot connect to face recognition service at $_baseUrl');
      } else {
        _logger.e('🌐 Network error: ${e.type} - ${e.message}');
      }
      return null;
    } catch (e) {
      _logger.e('❌ Error getting embedding: $e');
      return null;
    }
  }

  /// استخراج Face Embedding من صورة مقصوصة للوجه
  Future<List<double>?> getEmbeddingFromCroppedFace(img.Image faceImage) async {
    try {
      final base64Image = _imageToBase64(faceImage);
      
      final response = await _createDio().post('/api/face/detect', data: {
        'image': base64Image,
      });
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return List<double>.from(response.data['embedding']);
      } else {
        _logger.w('Face detection failed: ${response.data['error']}');
        return null;
      }
    } catch (e) {
      _logger.e('Error getting embedding from cropped face: $e');
      return null;
    }
  }

  /// استخراج Face Embedding من bytes
  Future<List<double>?> getEmbeddingFromBytes(Uint8List bytes) async {
    try {
      final base64Image = _bytesToBase64(bytes);
      
      final response = await _createDio().post('/api/face/detect', data: {
        'image': base64Image,
      });
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return List<double>.from(response.data['embedding']);
      } else {
        _logger.w('Face detection failed: ${response.data['error']}');
        return null;
      }
    } catch (e) {
      _logger.e('Error getting embedding from bytes: $e');
      return null;
    }
  }

  /// تسجيل وجه جديد
  Future<FaceRegistrationResult> registerFace(Uint8List imageBytes, {String? userId}) async {
    try {
      final base64Image = _bytesToBase64(imageBytes);
      
      final response = await _createDio().post('/api/face/register', data: {
        'image': base64Image,
        if (userId != null) 'user_id': userId,
      });
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return FaceRegistrationResult(
          success: true,
          embedding: List<double>.from(response.data['embedding']),
          message: response.data['message'] ?? 'تم تسجيل الوجه بنجاح',
        );
      } else {
        return FaceRegistrationResult(
          success: false,
          error: response.data['error'] ?? 'فشل في تسجيل الوجه',
          errorCode: response.data['error_code'],
        );
      }
    } catch (e) {
      _logger.e('Error registering face: $e');
      return FaceRegistrationResult(
        success: false,
        error: 'خطأ في الاتصال بخدمة التعرف على الوجه: ${e.toString()}',
        errorCode: 'CONNECTION_ERROR',
      );
    }
  }

  /// التحقق من الوجه
  Future<FaceVerificationResult> verifyFace(Uint8List imageBytes, List<double> storedEmbedding) async {
    try {
      final base64Image = _bytesToBase64(imageBytes);
      
      final response = await _createDio().post('/api/face/verify', data: {
        'image': base64Image,
        'stored_embedding': storedEmbedding,
      });
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return FaceVerificationResult(
          success: true,
          isVerified: response.data['verified'] ?? false,
          confidence: (response.data['confidence'] ?? 0.0).toDouble(),
          similarity: (response.data['similarity'] ?? 0.0).toDouble(),
          distance: (response.data['distance'] ?? 1.0).toDouble(),
          newEmbedding: response.data['new_embedding'] != null 
              ? List<double>.from(response.data['new_embedding'])
              : null,
        );
      } else {
        return FaceVerificationResult(
          success: false,
          isVerified: false,
          error: response.data['error'] ?? 'فشل في التحقق من الوجه',
          errorCode: response.data['error_code'],
        );
      }
    } catch (e) {
      _logger.e('Error verifying face: $e');
      return FaceVerificationResult(
        success: false,
        isVerified: false,
        error: 'خطأ في الاتصال بخدمة التعرف على الوجه',
        errorCode: 'CONNECTION_ERROR',
      );
    }
  }

  /// مقارنة وجهين
  FaceNetComparisonResult compareFaces(List<double> embedding1, List<double> embedding2) {
    if (embedding1.length != embedding2.length) {
      return FaceNetComparisonResult(
        isMatch: false,
        similarity: 0,
        distance: double.infinity,
        error: 'أحجام الـ embeddings غير متطابقة',
      );
    }

    // حساب المسافة الإقليدية
    double distance = 0;
    for (int i = 0; i < embedding1.length; i++) {
      distance += (embedding1[i] - embedding2[i]) * (embedding1[i] - embedding2[i]);
    }
    distance = distance > 0 ? distance.abs() : 0;
    distance = distance != 0 ? (distance as double) : 0.0;
    
    // حساب الجذر التربيعي
    double sqrtDistance = 0;
    if (distance > 0) {
      sqrtDistance = _sqrt(distance);
    }

    // حساب التشابه
    double similarity = (1 - sqrtDistance).clamp(0.0, 1.0);

    // تحديد التطابق
    final isMatch = sqrtDistance <= _matchThreshold;

    _logger.i('Face comparison: distance=$sqrtDistance, similarity=$similarity, match=$isMatch');

    return FaceNetComparisonResult(
      isMatch: isMatch,
      similarity: similarity,
      distance: sqrtDistance,
      threshold: _matchThreshold,
    );
  }
  
  // حساب الجذر التربيعي بدون استخدام dart:math
  double _sqrt(double value) {
    if (value <= 0) return 0;
    double guess = value / 2;
    for (int i = 0; i < 20; i++) {
      guess = (guess + value / guess) / 2;
    }
    return guess;
  }

  /// التحقق من أن الـ embedding صالح
  bool isValidEmbedding(List<double>? embedding) {
    if (embedding == null || embedding.isEmpty) return false;
    
    // قبول أحجام مختلفة من embeddings (128 لـ Facenet, 512 لـ Facenet512)
    if (embedding.length < 64 || embedding.length > 1024) return false;
    
    for (final val in embedding) {
      if (val.isNaN || val.isInfinite) return false;
    }
    
    return true;
  }

  /// حساب متوسط عدة embeddings
  List<double> averageEmbeddings(List<List<double>> embeddings) {
    if (embeddings.isEmpty) return [];
    if (embeddings.length == 1) return embeddings.first;
    
    final size = embeddings.first.length;
    final result = List<double>.filled(size, 0);
    
    for (final embedding in embeddings) {
      for (int i = 0; i < size; i++) {
        result[i] += embedding[i];
      }
    }
    
    for (int i = 0; i < size; i++) {
      result[i] /= embeddings.length;
    }
    
    return _normalizeEmbedding(result);
  }
  
  List<double> _normalizeEmbedding(List<double> embedding) {
    double sum = 0;
    for (final val in embedding) {
      sum += val * val;
    }
    final norm = _sqrt(sum);
    
    if (norm == 0) return embedding;
    
    return embedding.map((val) => val / norm).toList();
  }

  int get embeddingSize => _embeddingSize;
  
  void dispose() {
    // لا شيء لتنظيفه - نستخدم Dio جديد في كل طلب
  }
}

/// نتيجة تسجيل الوجه
class FaceRegistrationResult {
  final bool success;
  final List<double>? embedding;
  final String? message;
  final String? error;
  final String? errorCode;

  FaceRegistrationResult({
    required this.success,
    this.embedding,
    this.message,
    this.error,
    this.errorCode,
  });
}

/// نتيجة التحقق من الوجه
class FaceVerificationResult {
  final bool success;
  final bool isVerified;
  final double? confidence;
  final double? similarity;
  final double? distance;
  final List<double>? newEmbedding;
  final String? error;
  final String? errorCode;

  FaceVerificationResult({
    required this.success,
    required this.isVerified,
    this.confidence,
    this.similarity,
    this.distance,
    this.newEmbedding,
    this.error,
    this.errorCode,
  });
  
  String get confidencePercentage => '${((confidence ?? 0) * 100).toStringAsFixed(1)}%';
}

/// نتيجة مقارنة الوجوه
class FaceNetComparisonResult {
  final bool isMatch;
  final double similarity;
  final double distance;
  final double? threshold;
  final String? error;

  FaceNetComparisonResult({
    required this.isMatch,
    required this.similarity,
    required this.distance,
    this.threshold,
    this.error,
  });

  String get similarityPercentage => '${(similarity * 100).toStringAsFixed(1)}%';
  String get distanceText => distance.toStringAsFixed(3);

  @override
  String toString() {
    return 'FaceNetComparisonResult(match: $isMatch, similarity: $similarityPercentage, distance: $distanceText)';
  }
}
