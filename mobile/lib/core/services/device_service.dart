import 'dart:io';
import 'dart:convert';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// خدمة معرف الجهاز
/// تقوم بالحصول على معرف فريد للجهاز وبصمته
class DeviceService {
  static final DeviceService _instance = DeviceService._internal();
  factory DeviceService() => _instance;
  DeviceService._internal();

  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  
  static const String _deviceIdKey = 'registered_device_id';
  
  DeviceInfo? _cachedDeviceInfo;

  /// الحصول على معلومات الجهاز الكاملة
  Future<DeviceInfo> getDeviceInfo() async {
    if (_cachedDeviceInfo != null) return _cachedDeviceInfo!;

    final packageInfo = await PackageInfo.fromPlatform();

    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      _cachedDeviceInfo = DeviceInfo(
        deviceId: await _getOrCreateDeviceId(androidInfo.id),
        deviceName: androidInfo.model,
        deviceModel: androidInfo.model,
        deviceBrand: androidInfo.brand,
        platform: 'ANDROID',
        osVersion: 'Android ${androidInfo.version.release}',
        appVersion: packageInfo.version,
        isPhysicalDevice: androidInfo.isPhysicalDevice,
        fingerprint: _generateFingerprint(
          androidInfo.id,
          androidInfo.model,
          androidInfo.brand,
          'ANDROID',
          androidInfo.version.release,
        ),
        // معلومات إضافية
        additionalInfo: {
          'androidId': androidInfo.id,
          'manufacturer': androidInfo.manufacturer,
          'board': androidInfo.board,
          'hardware': androidInfo.hardware,
          'fingerprint': androidInfo.fingerprint,
          'sdkInt': androidInfo.version.sdkInt,
        },
      );
    } else if (Platform.isIOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      _cachedDeviceInfo = DeviceInfo(
        deviceId: await _getOrCreateDeviceId(iosInfo.identifierForVendor ?? ''),
        deviceName: iosInfo.name,
        deviceModel: iosInfo.model,
        deviceBrand: 'Apple',
        platform: 'IOS',
        osVersion: 'iOS ${iosInfo.systemVersion}',
        appVersion: packageInfo.version,
        isPhysicalDevice: iosInfo.isPhysicalDevice,
        fingerprint: _generateFingerprint(
          iosInfo.identifierForVendor ?? '',
          iosInfo.model,
          'Apple',
          'IOS',
          iosInfo.systemVersion,
        ),
        additionalInfo: {
          'identifierForVendor': iosInfo.identifierForVendor,
          'utsname': iosInfo.utsname.machine,
          'localizedModel': iosInfo.localizedModel,
        },
      );
    } else {
      throw UnsupportedError('المنصة غير مدعومة');
    }

    return _cachedDeviceInfo!;
  }

  /// الحصول على أو إنشاء معرف الجهاز
  /// نحتفظ بالمعرف في التخزين الآمن لضمان الاستمرارية
  Future<String> _getOrCreateDeviceId(String systemId) async {
    String? storedId = await _secureStorage.read(key: _deviceIdKey);
    
    if (storedId != null && storedId.isNotEmpty) {
      return storedId;
    }

    // إنشاء معرف فريد باستخدام معرف النظام + timestamp
    final uniqueId = _generateUniqueId(systemId);
    await _secureStorage.write(key: _deviceIdKey, value: uniqueId);
    
    return uniqueId;
  }

  /// إنشاء معرف فريد
  String _generateUniqueId(String baseId) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final combined = '$baseId-$timestamp';
    final bytes = utf8.encode(combined);
    final digest = sha256.convert(bytes);
    return digest.toString().substring(0, 32);
  }

  /// إنشاء بصمة الجهاز
  String _generateFingerprint(
    String deviceId,
    String model,
    String brand,
    String platform,
    String osVersion,
  ) {
    final data = '$deviceId|$model|$brand|$platform|$osVersion';
    final bytes = utf8.encode(data);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// التحقق من أن الجهاز حقيقي (ليس محاكي)
  Future<bool> isPhysicalDevice() async {
    final info = await getDeviceInfo();
    return info.isPhysicalDevice;
  }

  /// الحصول على معرف الجهاز فقط
  Future<String> getDeviceId() async {
    final info = await getDeviceInfo();
    return info.deviceId;
  }

  /// تنظيف الكاش
  void clearCache() {
    _cachedDeviceInfo = null;
  }

  /// تحويل معلومات الجهاز إلى JSON للإرسال
  Future<Map<String, dynamic>> toJson() async {
    final info = await getDeviceInfo();
    return info.toJson();
  }
}

/// نموذج معلومات الجهاز
class DeviceInfo {
  final String deviceId;
  final String deviceName;
  final String deviceModel;
  final String deviceBrand;
  final String platform;
  final String osVersion;
  final String appVersion;
  final bool isPhysicalDevice;
  final String fingerprint;
  final Map<String, dynamic>? additionalInfo;

  DeviceInfo({
    required this.deviceId,
    required this.deviceName,
    required this.deviceModel,
    required this.deviceBrand,
    required this.platform,
    required this.osVersion,
    required this.appVersion,
    required this.isPhysicalDevice,
    required this.fingerprint,
    this.additionalInfo,
  });

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'deviceName': deviceName,
      'deviceModel': deviceModel,
      'deviceBrand': deviceBrand,
      'platform': platform,
      'osVersion': osVersion,
      'appVersion': appVersion,
      'isPhysicalDevice': isPhysicalDevice,
      'deviceFingerprint': fingerprint,
    };
  }

  /// للعرض في الواجهة
  String get displayName => '$deviceBrand $deviceName';

  @override
  String toString() {
    return 'DeviceInfo(deviceId: $deviceId, name: $deviceName, platform: $platform)';
  }
}

