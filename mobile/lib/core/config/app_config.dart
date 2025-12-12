/// إعدادات التطبيق - Configuration
/// يحتوي على جميع الإعدادات المركزية للتطبيق

class AppConfig {
  // ==================== API Configuration ====================
  
  /// Base URL للـ API - غيّر هذا حسب بيئة العمل
  /// 
  /// للمحاكي Android Emulator: http://10.0.2.2:3000/api/v1
  /// لجهاز iOS Simulator: http://localhost:3000/api/v1
  /// للجهاز الحقيقي Android/iOS: http://YOUR_SERVER_IP:3000/api/v1
  ///   مثال: http://192.168.1.100:3000/api/v1
  /// 
  /// ملاحظة مهمة: إذا كنت تجرب على جهاز حقيقي، يجب تغيير هذا العنوان
  /// إلى IP السيرفر في نفس الشبكة. يمكنك معرفة IP السيرفر من خلال:
  /// - Windows: ipconfig في CMD
  /// - Mac/Linux: ifconfig في Terminal
  /// 
  /// لتغيير الـ URL عند البناء:
  /// flutter build apk --dart-define=API_URL=http://YOUR_IP:3000/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://192.168.1.17:3000/api/v1', // IP الكمبيوتر - تأكد أن السيرفر يعمل على هذا العنوان
  );
  
  /// Face Recognition Service URL - خدمة التعرف على الوجه Python
  /// يجب أن تعمل على نفس الشبكة
  static const String faceRecognitionUrl = String.fromEnvironment(
    'FACE_URL',
    defaultValue: 'http://192.168.1.17:5001', // عنوان خدمة التعرف على الوجه
  );
  
  /// API Endpoints
  static const String apiVersion = 'v1';
  static const int connectionTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000;

  // ==================== Auth Endpoints ====================
  static const String loginEndpoint = '/auth/login';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshTokenEndpoint = '/auth/refresh';
  static const String forgotPasswordEndpoint = '/auth/forgot-password';
  static const String fcmTokenEndpoint = '/auth/fcm-token';
  static const String changePasswordEndpoint = '/auth/change-password';

  // ==================== User Endpoints ====================
  static const String profileEndpoint = '/users/me';
  static const String updateProfileEndpoint = '/users/me';
  static const String usersListEndpoint = '/users';

  // ==================== Attendance Endpoints ====================
  static const String checkInEndpoint = '/attendance/check-in';
  static const String checkOutEndpoint = '/attendance/check-out';
  static const String todayAttendanceEndpoint = '/attendance/today';
  static const String attendanceHistoryEndpoint = '/attendance/history';
  static const String attendanceStatsEndpoint = '/attendance/stats';

  // ==================== Leaves Endpoints ====================
  static const String leavesEndpoint = '/leaves';
  static const String myLeavesEndpoint = '/leaves/my';
  static const String leaveTypesEndpoint = '/leaves/types';

  // ==================== Branches Endpoints ====================
  static const String branchesEndpoint = '/branches';
  static const String departmentsEndpoint = '/branches/departments/all';

  // ==================== Notifications Endpoints ====================
  static const String notificationsEndpoint = '/notifications';
  static const String unreadCountEndpoint = '/notifications/unread-count';
  static const String markAllReadEndpoint = '/notifications/read-all';

  // ==================== Reports Endpoints ====================
  static const String dashboardEndpoint = '/reports/dashboard';
  static const String attendanceReportEndpoint = '/reports/attendance';
  static const String exportExcelEndpoint = '/reports/export/excel';
  static const String exportPdfEndpoint = '/reports/export/pdf';

  // ==================== Geofencing ====================
  /// نصف قطر Geofence الافتراضي (بالمتر)
  static const int defaultGeofenceRadius = 100;
  
  /// الحد الأقصى للمسافة المسموح بها للحضور (بالمتر)
  static const int maxAttendanceDistance = 200;
  
  /// دقة الموقع المطلوبة
  static const double locationAccuracy = 10; // meters

  // ==================== App Settings ====================
  /// اللغة الافتراضية
  static const String defaultLanguage = 'ar';
  
  /// الثيمات المتاحة
  static const List<String> availableLanguages = ['ar', 'en'];
  
  /// المنطقة الزمنية الافتراضية
  static const String defaultTimezone = 'Asia/Riyadh';

  // ==================== Cache Settings ====================
  /// مدة صلاحية الكاش (بالدقائق)
  static const int cacheValidityMinutes = 30;
  
  /// مفاتيح التخزين المحلي
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String settingsKey = 'app_settings';
  static const String languageKey = 'language';
  static const String themeModeKey = 'theme_mode';

  // ==================== Validation ====================
  /// الحد الأدنى لطول كلمة المرور
  static const int minPasswordLength = 6;
  
  /// الحد الأقصى لعدد محاولات تسجيل الدخول
  static const int maxLoginAttempts = 5;
  
  /// مدة الحظر بعد تجاوز المحاولات (بالدقائق)
  static const int lockoutDurationMinutes = 15;

  // ==================== Firebase ====================
  /// تفعيل/تعطيل Firebase
  static const bool firebaseEnabled = false; // فعّله عند إضافة Firebase
}

/// URLs للبيئات المختلفة
class EnvironmentConfig {
  /// Development
  static const String developmentUrl = 'http://10.0.2.2:3000/api/v1';
  
  /// Staging
  static const String stagingUrl = 'https://staging-api.yourcompany.com/api/v1';
  
  /// Production
  static const String productionUrl = 'https://api.yourcompany.com/api/v1';
  
  /// الحصول على URL حسب البيئة
  static String getBaseUrl(String environment) {
    switch (environment) {
      case 'staging':
        return stagingUrl;
      case 'production':
        return productionUrl;
      default:
        return developmentUrl;
    }
  }
}

