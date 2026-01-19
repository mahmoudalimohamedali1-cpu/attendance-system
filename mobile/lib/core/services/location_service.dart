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

  /// فحص الموقع الوهمي - مُفعّل مع فحوصات متعددة
  Future<MockCheckResult> _comprehensiveMockCheck(Position position, List<Position> samples) async {
    final speedKmh = position.speed * 3.6;
    _logger.i('📍 Location: ${position.latitude}, ${position.longitude}');
    _logger.i('📊 Accuracy: ${position.accuracy}m, Speed: ${speedKmh.toStringAsFixed(1)}km/h');
    _logger.i('🔍 Android isMocked flag: ${position.isMocked}');
    
    // 1. فحص isMocked flag من Android (الأهم)
    if (position.isMocked) {
      _logger.w('⚠️ MOCK DETECTED: Android isMocked flag is TRUE');
      return MockCheckResult(isMock: true, reason: 'ANDROID_MOCKED_FLAG');
    }
    
    // 2. فحص دقة الموقع (accuracy)
    // GPS حقيقي: 5-100 متر
    // موقع وهمي: غالباً 0 أو دقيق جداً بشكل مثالي
    if (position.accuracy < _minAcceptableAccuracy || position.accuracy > _maxAcceptableAccuracy) {
      _logger.w('⚠️ SUSPICIOUS: Accuracy ${position.accuracy}m is outside normal range');
      // لا نرفض بناءً على الدقة فقط، لكن نسجل
    }
    
    // 3. فحص السرعة (speed)
    // سرعة غير منطقية تشير لتزوير
    if (speedKmh > _maxReasonableSpeed) {
      _logger.w('⚠️ MOCK DETECTED: Speed ${speedKmh.toStringAsFixed(1)}km/h is unreasonable');
      return MockCheckResult(isMock: true, reason: 'UNREASONABLE_SPEED');
    }
    
    // 4. فحص عمر الموقع (location age)
    final positionTimestamp = position.timestamp ?? DateTime.now();
    final locationAge = DateTime.now().difference(positionTimestamp);
    if (locationAge.inSeconds > 30) {
      _logger.w('⚠️ SUSPICIOUS: Location is ${locationAge.inSeconds}s old');
      // لا نرفض بناءً على العمر فقط، لكن نسجل
    }
    
    // 5. فحص التناسق بين العينات (Teleportation check)
    if (samples.length >= 2) {
      for (int i = 1; i < samples.length; i++) {
        final distance = Geolocator.distanceBetween(
          samples[i-1].latitude, samples[i-1].longitude,
          samples[i].latitude, samples[i].longitude,
        );
        // إذا تحرك أكثر من 100 متر في نصف ثانية = مشبوه جداً
        if (distance > 100) {
          _logger.w('⚠️ MOCK DETECTED: Teleportation detected - moved ${distance.toStringAsFixed(0)}m between samples');
          return MockCheckResult(isMock: true, reason: 'TELEPORTATION_DETECTED');
        }
      }
    }
    
    _logger.i('✅ Location check PASSED - appears genuine');
    return MockCheckResult(isMock: false, reason: null);
  }
  // Note: _checkForMockLocationApps and _checkDeveloperOptions were removed
  // as they cannot be implemented without native code and their results weren't used

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

    // فحص الموقع الوهمي - مُفعّل
    bool isMock = position.isMocked;
    String? mockReason;
    
    if (isMock) {
      _logger.w('⚠️ MOCK DETECTED in quick location: isMocked = true');
      mockReason = 'ANDROID_MOCKED_FLAG';
    }

    return LocationData(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      speed: position.speed,
      isMockLocation: isMock,
      mockReason: mockReason,
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
