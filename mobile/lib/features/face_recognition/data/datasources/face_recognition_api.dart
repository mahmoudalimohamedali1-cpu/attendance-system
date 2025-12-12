import 'package:dio/dio.dart';
import '../../../../core/config/app_config.dart';

/// API للتعرف على الوجه
class FaceRecognitionApi {
  final Dio _dio;

  FaceRecognitionApi(this._dio);

  /// تسجيل وجه جديد
  Future<Map<String, dynamic>> registerFace({
    required List<double> faceEmbedding,
    String? faceImage,
    double? confidence,
    String? deviceInfo,
  }) async {
    final response = await _dio.post(
      '/face-recognition/register',
      data: {
        'faceEmbedding': faceEmbedding,
        'faceImage': faceImage,
        'confidence': confidence,
        'deviceInfo': deviceInfo,
      },
    );
    return response.data;
  }

  /// التحقق من الوجه
  Future<Map<String, dynamic>> verifyFace({
    required List<double> faceEmbedding,
    String? faceImage,
    String verificationType = 'VERIFICATION',
    double threshold = 0.6,
    String? deviceInfo,
    bool saveAttemptImage = false,
  }) async {
    final response = await _dio.post(
      '/face-recognition/verify',
      data: {
        'faceEmbedding': faceEmbedding,
        'faceImage': faceImage,
        'verificationType': verificationType,
        'threshold': threshold,
        'deviceInfo': deviceInfo,
        'saveAttemptImage': saveAttemptImage,
      },
    );
    return response.data;
  }

  /// حالة تسجيل الوجه
  Future<Map<String, dynamic>> getFaceStatus() async {
    final response = await _dio.get('/face-recognition/status');
    return response.data;
  }

  /// حذف بيانات الوجه
  Future<Map<String, dynamic>> deleteFaceData() async {
    final response = await _dio.delete('/face-recognition/my-face');
    return response.data;
  }
}

/// تسجيل الحضور مع التحقق من الوجه
class AttendanceWithFaceApi {
  final Dio _dio;

  AttendanceWithFaceApi(this._dio);

  /// تسجيل الحضور مع التحقق من الوجه
  Future<Map<String, dynamic>> checkInWithFace({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    double? accuracy,
    List<double>? faceEmbedding,
    String? faceImage,
    double? faceConfidence,
    bool faceVerifiedLocally = false,
  }) async {
    final response = await _dio.post(
      '/attendance/check-in',
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'isMockLocation': isMockLocation,
        'deviceInfo': deviceInfo,
        'accuracy': accuracy,
        'faceEmbedding': faceEmbedding,
        'faceImage': faceImage,
        'faceConfidence': faceConfidence,
        'faceVerifiedLocally': faceVerifiedLocally,
      },
    );
    return response.data;
  }

  /// تسجيل الانصراف مع التحقق من الوجه
  Future<Map<String, dynamic>> checkOutWithFace({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
    double? faceConfidence,
    bool faceVerifiedLocally = false,
  }) async {
    final response = await _dio.post(
      '/attendance/check-out',
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'isMockLocation': isMockLocation,
        'deviceInfo': deviceInfo,
        'notes': notes,
        'faceEmbedding': faceEmbedding,
        'faceImage': faceImage,
        'faceConfidence': faceConfidence,
        'faceVerifiedLocally': faceVerifiedLocally,
      },
    );
    return response.data;
  }
}

