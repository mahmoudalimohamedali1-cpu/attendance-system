import 'dart:convert';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:logger/logger.dart';

/// نتيجة فحص Play Integrity
class IntegrityCheckResult {
  final bool isValid;
  final String? token;
  final String? errorMessage;
  final Map<String, dynamic>? verdict;
  
  IntegrityCheckResult({
    required this.isValid,
    this.token,
    this.errorMessage,
    this.verdict,
  });

  factory IntegrityCheckResult.success(String token) {
    return IntegrityCheckResult(isValid: true, token: token);
  }

  factory IntegrityCheckResult.error(String message) {
    return IntegrityCheckResult(isValid: false, errorMessage: message);
  }

  Map<String, dynamic> toJson() => {
    'isValid': isValid,
    'token': token,
    'errorMessage': errorMessage,
    'verdict': verdict,
  };
}

/// خدمة Play Integrity API
/// تستخدم للتحقق من:
/// - صحة الجهاز (ليس emulator أو rooted)
/// - صحة التطبيق (ليس معدّل أو مخترق)
/// - حساب Google موثوق
/// 
/// ملاحظة: يتطلب إعداد Google Cloud Console وPlay Console
class IntegrityService {
  static final Logger _logger = Logger();
  static const MethodChannel _channel = MethodChannel('com.attendance/integrity');

  /// توليد nonce عشوائي
  static String _generateNonce() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (i) => random.nextInt(256));
    return base64Url.encode(bytes);
  }

  /// طلب Integrity Token من Google Play
  /// يتم عبر native Kotlin code
  static Future<IntegrityCheckResult> requestIntegrityToken() async {
    try {
      _logger.i('🔐 Requesting Play Integrity token via native channel...');
      
      final nonce = _generateNonce();
      
      // استدعاء native method
      final result = await _channel.invokeMethod('requestIntegrityToken', {
        'nonce': nonce,
      });

      if (result != null && result is Map) {
        final success = result['success'] ?? false;
        final token = result['token'] as String?;
        final error = result['error'] as String?;

        if (success && token != null) {
          _logger.i('✅ Play Integrity token received (${token.length} chars)');
          return IntegrityCheckResult.success(token);
        } else {
          _logger.w('⚠️ Play Integrity failed: $error');
          return IntegrityCheckResult.error(error ?? 'Unknown error');
        }
      }
      
      // إذا لم يتم تفعيل Play Integrity، نسمح بالمتابعة
      _logger.w('⚠️ Play Integrity not configured - allowing gracefully');
      return IntegrityCheckResult(
        isValid: true,
        errorMessage: 'Play Integrity not configured',
      );
    } on MissingPluginException {
      // Method Channel غير متاح - نسمح بالمتابعة
      _logger.w('⚠️ Integrity channel not available - graceful degradation');
      return IntegrityCheckResult(
        isValid: true,
        errorMessage: 'Integrity check not available',
      );
    } on PlatformException catch (e) {
      _logger.e('❌ Play Integrity error: ${e.code} - ${e.message}');
      
      // رسائل خطأ مفهومة للمستخدم
      String errorMessage;
      switch (e.code) {
        case 'API_NOT_AVAILABLE':
          errorMessage = 'خدمة التحقق غير متاحة على هذا الجهاز';
          break;
        case 'PLAY_STORE_NOT_FOUND':
          errorMessage = 'يجب تثبيت Google Play Store';
          break;
        case 'NETWORK_ERROR':
          errorMessage = 'خطأ في الاتصال بالإنترنت';
          break;
        case 'NOT_CONFIGURED':
          // نسمح بالمتابعة إذا لم يتم تكوين Play Integrity
          return IntegrityCheckResult(
            isValid: true,
            errorMessage: 'Play Integrity not configured',
          );
        default:
          errorMessage = 'فشل التحقق: ${e.message}';
      }
      
      // في حالة الخطأ، نسمح بالمتابعة (graceful degradation)
      return IntegrityCheckResult(
        isValid: true,
        errorMessage: errorMessage,
      );
    } catch (e) {
      _logger.e('❌ Unexpected error: $e');
      // نسمح بالمتابعة في حالة أي خطأ
      return IntegrityCheckResult(
        isValid: true,
        errorMessage: 'Integrity check failed: $e',
      );
    }
  }

  /// التحقق من صلاحية التطبيق للعمل
  /// يُستخدم قبل عملية تسجيل الحضور
  static Future<bool> isAppIntegrityValid() async {
    try {
      final result = await requestIntegrityToken();
      return result.isValid;
    } catch (e) {
      _logger.e('❌ isAppIntegrityValid error: $e');
      return true; // Graceful degradation
    }
  }

  /// إنشاء طلب حضور مع Integrity Token
  /// يُرسل التوكن للخادم للتحقق منه
  static Future<Map<String, dynamic>> createSecureAttendanceRequest({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    final request = <String, dynamic>{
      'latitude': latitude,
      'longitude': longitude,
      'isMockLocation': isMockLocation,
      'deviceInfo': deviceInfo,
      'faceEmbedding': faceEmbedding,
      'faceImage': faceImage,
    };

    try {
      // محاولة الحصول على Integrity Token
      final integrityResult = await requestIntegrityToken();
      
      if (integrityResult.isValid && integrityResult.token != null) {
        request['integrityToken'] = integrityResult.token;
        _logger.i('✅ Integrity token added to request');
      } else {
        _logger.w('⚠️ No integrity token: ${integrityResult.errorMessage}');
        // نضيف علامة أن التحقق فشل
        request['integrityCheckFailed'] = true;
        request['integrityError'] = integrityResult.errorMessage;
      }
    } catch (e) {
      _logger.e('❌ Failed to add integrity token: $e');
      request['integrityCheckFailed'] = true;
    }

    return request;
  }
}
