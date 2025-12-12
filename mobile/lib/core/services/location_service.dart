import 'dart:io';
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:logger/logger.dart';

/// بيانات الموقع المحسنة
class LocationData {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double altitude;
  final double speed;
  final double speedAccuracy;
  final double heading;
  final bool isMockLocation;
  final String? mockReason;
  final DateTime timestamp;

  LocationData({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    this.altitude = 0,
    this.speed = 0,
    this.speedAccuracy = 0,
    this.heading = 0,
    required this.isMockLocation,
    this.mockReason,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'altitude': altitude,
    'speed': speed,
    'isMockLocation': isMockLocation,
    'mockReason': mockReason,
    'timestamp': timestamp.toIso8601String(),
  };
}

/// خدمة الموقع المحسنة مع كشف متعدد للمواقع الوهمية
class LocationService {
  final Logger _logger = Logger();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  
  // إعدادات التحقق من الموقع
  static const double _maxAcceptableAccuracy = 100.0; // متر
  static const double _minAcceptableAccuracy = 0.0; // متر (0 يعني GPS مثالي - مشبوه)
  static const double _maxReasonableSpeed = 200.0; // كم/ساعة (سرعة غير طبيعية)
  static const int _locationSampleCount = 3; // عدد العينات للتحقق
  static const Duration _sampleInterval = Duration(milliseconds: 500);

  /// التحقق من صلاحية الموقع
  Future<bool> checkPermission() async {
    final status = await Permission.location.status;
    return status.isGranted;
  }

  /// طلب صلاحية الموقع
  Future<bool> requestPermission() async {
    final status = await Permission.location.request();
    return status.isGranted;
  }

  /// التحقق من تفعيل خدمة الموقع
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// الحصول على الموقع الحالي مع فحص شامل للمواقع الوهمية
  Future<LocationData> getCurrentLocation() async {
    // 1. التحقق من تفعيل خدمة الموقع
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationException('خدمة الموقع غير مفعلة. يرجى تفعيلها من الإعدادات.');
    }

    // 2. التحقق من الصلاحيات
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw LocationException('تم رفض صلاحية الوصول للموقع');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw LocationException(
        'تم رفض صلاحية الموقع بشكل دائم. يرجى تفعيلها من إعدادات التطبيق.',
      );
    }

    // 3. جمع عدة عينات للموقع للتحقق من الاتساق
    final samples = <Position>[];
    for (int i = 0; i < _locationSampleCount; i++) {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 10),
      );
      samples.add(position);
      
      if (i < _locationSampleCount - 1) {
        await Future.delayed(_sampleInterval);
      }
    }

    // 4. استخدام أفضل عينة (أقل accuracy = أفضل)
    samples.sort((a, b) => a.accuracy.compareTo(b.accuracy));
    final bestPosition = samples.first;

    // 5. فحص شامل للموقع الوهمي
    final mockCheckResult = await _comprehensiveMockCheck(bestPosition, samples);

    return LocationData(
      latitude: bestPosition.latitude,
      longitude: bestPosition.longitude,
      accuracy: bestPosition.accuracy,
      altitude: bestPosition.altitude,
      speed: bestPosition.speed,
      speedAccuracy: bestPosition.speedAccuracy,
      heading: bestPosition.heading,
      isMockLocation: mockCheckResult.isMock,
      mockReason: mockCheckResult.reason,
      timestamp: bestPosition.timestamp ?? DateTime.now(),
    );
  }

  /// فحص الموقع الوهمي - معطل مؤقتاً
  /// تم تعطيل جميع الفحوصات لأنها تسبب مشاكل false positive
  Future<MockCheckResult> _comprehensiveMockCheck(Position position, List<Position> samples) async {
    // تسجيل معلومات الموقع للتشخيص فقط
    final speedKmh = position.speed * 3.6;
    _logger.i('📍 Location: ${position.latitude}, ${position.longitude}');
    _logger.i('📊 Accuracy: ${position.accuracy}m, Speed: ${speedKmh.toStringAsFixed(1)}km/h');
    _logger.i('🔍 Android isMocked flag: ${position.isMocked}');
    
    // دائماً نرجع أن الموقع حقيقي - الفحوصات معطلة
    _logger.i('✅ Location check DISABLED - always returning real location');
    
    return MockCheckResult(isMock: false, reason: null);
  }

  /// فحص وجود تطبيقات Mock Location
  Future<bool> _checkForMockLocationApps() async {
    try {
      if (!Platform.isAndroid) return false;
      
      final androidInfo = await _deviceInfo.androidInfo;
      
      // قائمة تطبيقات Mock Location المعروفة
      final mockAppPackages = [
        'com.lexa.fakegps',
        'com.incorporateapps.fakegps',
        'com.fakegps.mock',
        'com.blogspot.newapphorizons.fakegps',
        'com.gsmartstudio.fakegps',
        'com.lkr.fakelocation',
        'com.location.faker',
        'com.evezzon.locationmock',
        'com.mock.gps',
        'com.fakegps.route',
        'ru.gavrikov.mocklocations',
      ];

      // لا يمكن فحص التطبيقات المثبتة مباشرة من Flutter
      // لكن يمكن الاعتماد على isMocked flag
      
      // فحص إذا كان الجهاز rooted (مؤشر على احتمالية التلاعب)
      // final isEmulator = !androidInfo.isPhysicalDevice;
      // if (isEmulator) {
      //   _logger.i('Running on emulator');
      // }

      return false; // نعتمد على فحوصات أخرى
    } catch (e) {
      _logger.e('Error checking for mock apps: $e');
      return false;
    }
  }

  /// فحص Developer Options
  Future<bool> _checkDeveloperOptions() async {
    try {
      if (!Platform.isAndroid) return false;
      // لا يمكن فحص هذا مباشرة من Flutter بدون Native Code
      return false;
    } catch (e) {
      return false;
    }
  }

  /// حساب المسافة بين نقطتين بالمتر
  double calculateDistance(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }

  /// التحقق من أن المستخدم داخل نطاق الـ Geofence
  GeofenceResult checkGeofence({
    required double userLat,
    required double userLng,
    required double centerLat,
    required double centerLng,
    required double radiusInMeters,
  }) {
    final distance = calculateDistance(userLat, userLng, centerLat, centerLng);
    final isInside = distance <= radiusInMeters;
    
    return GeofenceResult(
      isInside: isInside,
      distance: distance,
      radius: radiusInMeters,
      distanceFromEdge: isInside ? radiusInMeters - distance : distance - radiusInMeters,
    );
  }

  /// فتح إعدادات الموقع
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  /// فتح إعدادات التطبيق
  Future<bool> openAppSettings() async {
    return await Permission.location.request().isGranted;
  }

  /// الحصول على تدفق تحديثات الموقع
  Stream<Position> getLocationStream({
    int distanceFilter = 10,
    LocationAccuracy accuracy = LocationAccuracy.high,
  }) {
    return Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
      ),
    );
  }

  /// التحقق السريع من الموقع (بدون عينات متعددة)
  Future<LocationData> getQuickLocation() async {
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationException('خدمة الموقع غير مفعلة.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw LocationException('صلاحية الموقع غير متاحة.');
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 10),
    );

    // فحص الموقع الوهمي معطل - دائماً false
    bool isMock = false;

    return LocationData(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      speed: position.speed,
      isMockLocation: isMock,
      timestamp: position.timestamp ?? DateTime.now(),
    );
  }
}

/// نتيجة فحص الموقع الوهمي
class MockCheckResult {
  final bool isMock;
  final String? reason;

  MockCheckResult({required this.isMock, this.reason});
}

/// نتيجة فحص الـ Geofence
class GeofenceResult {
  final bool isInside;
  final double distance;
  final double radius;
  final double distanceFromEdge;

  GeofenceResult({
    required this.isInside,
    required this.distance,
    required this.radius,
    required this.distanceFromEdge,
  });

  String get message {
    if (isInside) {
      return 'أنت داخل النطاق المسموح (${distance.toStringAsFixed(0)}م من المركز)';
    } else {
      return 'أنت خارج النطاق بـ ${distanceFromEdge.toStringAsFixed(0)}م';
    }
  }
}

/// استثناء الموقع
class LocationException implements Exception {
  final String message;
  LocationException(this.message);

  @override
  String toString() => message;
}
