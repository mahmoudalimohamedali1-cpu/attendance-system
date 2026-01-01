import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:logger/logger.dart';
import '../network/api_client.dart';
import 'location_service.dart';

/// خدمة تتبع الموقع في الخلفية
/// تعمل بعد تسجيل الحضور وترسل تحديثات للسيرفر كل 30 ثانية
class LocationTrackingService {
  final ApiClient _apiClient;
  final LocationService _locationService;
  final Logger _logger = Logger();
  final Battery _battery = Battery();

  bool _isTracking = false;
  Timer? _trackingTimer;
  StreamSubscription<Position>? _locationSubscription;

  static const int _updateIntervalSeconds = 30;

  LocationTrackingService(this._apiClient, this._locationService);

  /// بدء تتبع الموقع
  Future<void> startTracking() async {
    if (_isTracking) {
      _logger.w('Location tracking already started');
      return;
    }

    _logger.i('🚀 Starting location tracking...');
    _isTracking = true;

    // إرسال تحديث فوري عند البدء
    await _sendLocationUpdate();

    // بدء المؤقت لإرسال تحديثات دورية
    _trackingTimer = Timer.periodic(
      const Duration(seconds: _updateIntervalSeconds),
      (_) => _sendLocationUpdate(),
    );

    _logger.i('✅ Location tracking started - updates every $_updateIntervalSeconds seconds');
  }

  /// إيقاف تتبع الموقع
  Future<void> stopTracking() async {
    if (!_isTracking) {
      _logger.w('Location tracking not running');
      return;
    }

    _logger.i('🛑 Stopping location tracking...');
    
    _trackingTimer?.cancel();
    _trackingTimer = null;
    
    await _locationSubscription?.cancel();
    _locationSubscription = null;
    
    _isTracking = false;
    _logger.i('✅ Location tracking stopped');
  }

  /// إرسال تحديث الموقع للسيرفر
  Future<void> _sendLocationUpdate() async {
    try {
      // الحصول على الموقع الحالي
      final locationData = await _locationService.getQuickLocation();
      
      // الحصول على مستوى البطارية
      final batteryLevel = await _getBatteryLevel();
      
      // الحصول على معلومات الجهاز
      final deviceInfo = await _getDeviceInfo();

      // إرسال للسيرفر
      final response = await _apiClient.updateLocation({
        'latitude': locationData.latitude,
        'longitude': locationData.longitude,
        'accuracy': locationData.accuracy,
        'batteryLevel': batteryLevel,
        'deviceInfo': deviceInfo,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        _logger.d('📍 Location updated - Inside geofence: ${data['isInsideGeofence']}, Distance: ${data['distanceFromBranch']}m');
      }
    } catch (e) {
      _logger.e('❌ Failed to send location update: $e');
      // لا نوقف التتبع عند الفشل، سنحاول مرة أخرى في التحديث التالي
    }
  }

  /// الحصول على مستوى البطارية
  Future<double?> _getBatteryLevel() async {
    try {
      final level = await _battery.batteryLevel;
      return level.toDouble();
    } catch (e) {
      _logger.e('Failed to get battery level: $e');
      return null;
    }
  }

  /// الحصول على معلومات الجهاز
  Future<String> _getDeviceInfo() async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();
      if (await _isAndroid()) {
        final androidInfo = await deviceInfoPlugin.androidInfo;
        return '${androidInfo.manufacturer} ${androidInfo.model}';
      } else {
        final iosInfo = await deviceInfoPlugin.iosInfo;
        return '${iosInfo.name} ${iosInfo.model}';
      }
    } catch (e) {
      return 'Unknown Device';
    }
  }

  Future<bool> _isAndroid() async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();
      await deviceInfoPlugin.androidInfo;
      return true;
    } catch (e) {
      return false;
    }
  }

  /// هل التتبع يعمل؟
  bool get isTracking => _isTracking;
}
