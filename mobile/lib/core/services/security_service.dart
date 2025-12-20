import 'package:flutter/services.dart';
import 'package:logger/logger.dart';

/// نتيجة الفحص الأمني
class SecurityCheckResult {
  final bool developerOptionsEnabled;
  final bool mockLocationEnabled;
  final bool mockAppsInstalled;
  final List<String> mockAppsList;
  final bool isRooted;
  final bool isEmulator;
  final bool usbDebuggingEnabled;
  final int riskScore;
  final bool isSecure;
  final String? errorMessage;

  SecurityCheckResult({
    required this.developerOptionsEnabled,
    required this.mockLocationEnabled,
    required this.mockAppsInstalled,
    required this.mockAppsList,
    required this.isRooted,
    required this.isEmulator,
    required this.usbDebuggingEnabled,
    required this.riskScore,
    required this.isSecure,
    this.errorMessage,
  });

  factory SecurityCheckResult.fromMap(Map<dynamic, dynamic> map) {
    return SecurityCheckResult(
      developerOptionsEnabled: map['developerOptionsEnabled'] ?? false,
      mockLocationEnabled: map['mockLocationEnabled'] ?? false,
      mockAppsInstalled: map['mockAppsInstalled'] ?? false,
      mockAppsList: (map['mockAppsList'] as List?)?.cast<String>() ?? [],
      isRooted: map['isRooted'] ?? false,
      isEmulator: map['isEmulator'] ?? false,
      usbDebuggingEnabled: map['usbDebuggingEnabled'] ?? false,
      riskScore: map['riskScore'] ?? 0,
      isSecure: map['isSecure'] ?? true,
    );
  }

  factory SecurityCheckResult.error(String message) {
    return SecurityCheckResult(
      developerOptionsEnabled: false,
      mockLocationEnabled: false,
      mockAppsInstalled: false,
      mockAppsList: [],
      isRooted: false,
      isEmulator: false,
      usbDebuggingEnabled: false,
      riskScore: 0,
      isSecure: true, // نعتبره آمن إذا فشل الفحص لتجنب حظر المستخدمين
      errorMessage: message,
    );
  }

  /// هل يجب حظر الحضور؟
  bool get shouldBlockAttendance {
    // حظر إذا: تطبيقات mock مثبتة أو root أو emulator
    return mockAppsInstalled || isRooted || isEmulator;
  }

  /// سبب الحظر (إن وجد)
  String? get blockReason {
    if (mockAppsInstalled) {
      return 'تم اكتشاف تطبيق تزوير موقع مثبت على جهازك: ${mockAppsList.first}';
    }
    if (isRooted) {
      return 'الجهاز مخترق (Rooted). لا يمكن تسجيل الحضور من جهاز مخترق.';
    }
    if (isEmulator) {
      return 'أنت تستخدم محاكي (Emulator). يجب استخدام جهاز حقيقي.';
    }
    return null;
  }

  Map<String, dynamic> toJson() => {
    'developerOptionsEnabled': developerOptionsEnabled,
    'mockLocationEnabled': mockLocationEnabled,
    'mockAppsInstalled': mockAppsInstalled,
    'mockAppsList': mockAppsList,
    'isRooted': isRooted,
    'isEmulator': isEmulator,
    'usbDebuggingEnabled': usbDebuggingEnabled,
    'riskScore': riskScore,
    'isSecure': isSecure,
    'errorMessage': errorMessage,
  };

  @override
  String toString() => 'SecurityCheckResult(secure: $isSecure, risk: $riskScore, root: $isRooted, mock: $mockAppsInstalled, emu: $isEmulator)';
}

/// خدمة الأمان - تتواصل مع كود Android الأصلي
class SecurityService {
  static const MethodChannel _channel = MethodChannel('com.attendance/security');
  static final Logger _logger = Logger();

  /// إجراء فحص أمني شامل
  static Future<SecurityCheckResult> performSecurityCheck() async {
    try {
      final result = await _channel.invokeMethod('checkSecurity');
      final securityResult = SecurityCheckResult.fromMap(result as Map);
      
      _logger.i('🔒 Security Check Results:');
      _logger.i('   Developer Options: ${securityResult.developerOptionsEnabled}');
      _logger.i('   Mock Apps: ${securityResult.mockAppsInstalled} (${securityResult.mockAppsList.length})');
      _logger.i('   Rooted: ${securityResult.isRooted}');
      _logger.i('   Emulator: ${securityResult.isEmulator}');
      _logger.i('   Risk Score: ${securityResult.riskScore}');
      _logger.i('   Secure: ${securityResult.isSecure}');
      
      if (securityResult.shouldBlockAttendance) {
        _logger.w('⚠️ SECURITY BLOCK: ${securityResult.blockReason}');
      }
      
      return securityResult;
    } on PlatformException catch (e) {
      _logger.e('❌ Security check failed: ${e.message}');
      return SecurityCheckResult.error(e.message ?? 'Unknown error');
    } catch (e) {
      _logger.e('❌ Security check error: $e');
      return SecurityCheckResult.error(e.toString());
    }
  }

  /// فحص سريع: هل يجب حظر الحضور؟
  static Future<bool> shouldBlockAttendance() async {
    final result = await performSecurityCheck();
    return result.shouldBlockAttendance;
  }

  /// الحصول على سبب الحظر
  static Future<String?> getBlockReason() async {
    final result = await performSecurityCheck();
    return result.blockReason;
  }

  /// هل المطور Options مفعلة؟
  static Future<bool> isDeveloperOptionsEnabled() async {
    try {
      return await _channel.invokeMethod('isDeveloperOptionsEnabled') ?? false;
    } catch (e) {
      _logger.e('Error checking developer options: $e');
      return false;
    }
  }

  /// هل الجهاز rooted؟
  static Future<bool> isRooted() async {
    try {
      return await _channel.invokeMethod('isRooted') ?? false;
    } catch (e) {
      _logger.e('Error checking root: $e');
      return false;
    }
  }

  /// الحصول على قائمة تطبيقات Mock المثبتة
  static Future<List<String>> getMockApps() async {
    try {
      final result = await _channel.invokeMethod('getMockApps');
      return (result as List?)?.cast<String>() ?? [];
    } catch (e) {
      _logger.e('Error getting mock apps: $e');
      return [];
    }
  }
}
