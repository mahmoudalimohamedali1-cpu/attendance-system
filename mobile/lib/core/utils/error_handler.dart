import 'package:dio/dio.dart';
import '../error/exceptions.dart';

/// تحويل رسائل الخطأ من أكواد لرسائل عربية واضحة
class ErrorHandler {
  /// تحويل DioException لرسالة واضحة
  static String handleDioError(DioException e) {
    // إذا السيرفر رد برسالة
    if (e.response != null) {
      final data = e.response!.data;
      
      // إذا السيرفر أرسل رسالة واضحة
      if (data is Map) {
        // محاولة استخراج رسالة الخطأ من validation errors
        if (data['message'] is List) {
          final messages = (data['message'] as List).map((m) => m.toString()).join(', ');
          return _translateMessage(messages);
        }
        
        final message = data['message'] ?? data['error'];
        if (message != null && !_isCodeMessage(message.toString())) {
          return _translateMessage(message.toString());
        }
        
        // إذا كان هناك validation errors
        if (data['errors'] is List) {
          final errors = (data['errors'] as List).map((e) => e.toString()).join(', ');
          return _translateMessage(errors);
        }
      }
      
      // حسب كود الخطأ
      return _getMessageFromStatusCode(e.response!.statusCode);
    }
    
    // أخطاء الاتصال
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return 'انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت';
      case DioExceptionType.sendTimeout:
        return 'انتهت مهلة إرسال البيانات. حاول مرة أخرى';
      case DioExceptionType.receiveTimeout:
        return 'انتهت مهلة استقبال البيانات. حاول مرة أخرى';
      case DioExceptionType.badResponse:
        return 'استجابة غير صحيحة من السيرفر';
      case DioExceptionType.cancel:
        return 'تم إلغاء الطلب';
      case DioExceptionType.connectionError:
        return 'لا يمكن الاتصال بالسيرفر. تأكد من اتصالك بالإنترنت';
      case DioExceptionType.badCertificate:
        return 'مشكلة في شهادة الأمان';
      case DioExceptionType.unknown:
      default:
        return 'حدث خطأ غير متوقع. حاول مرة أخرى';
    }
  }

  /// تحويل كود الحالة لرسالة واضحة
  static String _getMessageFromStatusCode(int? statusCode) {
    switch (statusCode) {
      case 400:
        return 'البيانات المدخلة غير صحيحة';
      case 401:
        return 'يرجى تسجيل الدخول مرة أخرى';
      case 403:
        return 'ليس لديك صلاحية للقيام بهذا الإجراء';
      case 404:
        return 'الصفحة أو البيانات غير موجودة';
      case 409:
        return 'البيانات موجودة مسبقاً';
      case 422:
        return 'البيانات المدخلة غير صالحة';
      case 429:
        return 'طلبات كثيرة جداً. انتظر قليلاً وحاول مرة أخرى';
      case 500:
        return 'حدث خطأ في السيرفر. حاول لاحقاً';
      case 502:
        return 'السيرفر غير متاح حالياً';
      case 503:
        return 'الخدمة غير متاحة مؤقتاً';
      case 504:
        return 'انتهت مهلة الاتصال بالسيرفر';
      default:
        return 'حدث خطأ غير متوقع';
    }
  }

  /// التحقق إذا الرسالة كود برمجي
  static bool _isCodeMessage(String message) {
    // التحقق من أنماط الأكواد البرمجية
    final codePatterns = [
      RegExp(r'^[A-Z_]+$'), // LIKE_THIS
      RegExp(r'^\[.*\]$'), // [object Object]
      RegExp(r'^Error:'), // Error: ...
      RegExp(r'^Exception'), // Exception...
      RegExp(r'^\{.*\}$'), // {...}
      RegExp(r'^null$', caseSensitive: false), // null
      RegExp(r'^undefined$', caseSensitive: false), // undefined
      RegExp(r'Exception|Error|Stack|Trace', caseSensitive: false), // تقني
    ];

    for (final pattern in codePatterns) {
      if (pattern.hasMatch(message)) {
        return true;
      }
    }
    
    return false;
  }

  /// ترجمة رسائل الـ Backend الإنجليزية للعربية
  static String _translateMessage(String message) {
    final translations = {
      // Authentication
      'Invalid credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      'User not found': 'المستخدم غير موجود',
      'Email already exists': 'البريد الإلكتروني مستخدم مسبقاً',
      'Invalid token': 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
      'Token expired': 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
      'Unauthorized': 'يرجى تسجيل الدخول',
      'Access denied': 'ليس لديك صلاحية للوصول',
      'Forbidden': 'غير مصرح لك بهذا الإجراء',
      
      // Attendance
      'Already checked in': 'لقد سجلت الحضور مسبقاً اليوم',
      'Already checked out': 'لقد سجلت الانصراف مسبقاً اليوم',
      'Not checked in yet': 'لم تسجل الحضور بعد',
      'Check-in required first': 'يجب تسجيل الحضور أولاً',
      'Outside geofence': 'أنت خارج نطاق العمل المسموح',
      'Mock location detected': 'تم اكتشاف موقع وهمي. يرجى تعطيل تطبيقات المواقع الوهمية',
      'Location not available': 'تعذر تحديد موقعك الحالي',
      'Face not registered': 'يجب تسجيل الوجه أولاً',
      'Face mismatch': 'الوجه غير مطابق للوجه المسجل',
      'Face verification failed': 'فشل التحقق من الوجه. حاول مرة أخرى',
      
      // Leaves
      'Insufficient leave balance': 'رصيد الإجازات غير كافٍ',
      'Leave already exists': 'يوجد طلب إجازة في هذه الفترة',
      'Leave request pending': 'طلب الإجازة قيد المراجعة',
      'Leave request rejected': 'تم رفض طلب الإجازة',
      'تاريخ النهاية يجب أن يكون بعد تاريخ البداية': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
      'رصيد الإجازات غير كافي': 'رصيد الإجازات غير كافي',
      'يوجد طلب إجازة متداخل مع هذه الفترة': 'يوجد طلب إجازة متداخل مع هذه الفترة',
      'Invalid date format': 'صيغة التاريخ غير صحيحة',
      'Date validation failed': 'التحقق من التاريخ فشل',
      
      // General
      'Not found': 'غير موجود',
      'Bad request': 'طلب غير صحيح',
      'Internal server error': 'خطأ في السيرفر',
      'Service unavailable': 'الخدمة غير متاحة',
      'Network error': 'خطأ في الاتصال',
      'Connection refused': 'تعذر الاتصال بالسيرفر',
      'Timeout': 'انتهت مهلة الاتصال',
    };

    // البحث عن ترجمة مطابقة (case insensitive)
    final lowerMessage = message.toLowerCase();
    for (final entry in translations.entries) {
      if (lowerMessage.contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }

    // إذا الرسالة بالعربية أصلاً، ارجعها كما هي
    if (_isArabic(message)) {
      return message;
    }

    // إذا لم نجد ترجمة، نرجع رسالة عامة
    return 'حدث خطأ غير متوقع. حاول مرة أخرى';
  }

  /// التحقق إذا النص عربي
  static bool _isArabic(String text) {
    return RegExp(r'[\u0600-\u06FF]').hasMatch(text);
  }

  /// معالجة أي نوع من الأخطاء
  static String handleError(dynamic error, {String? defaultMessage}) {
    if (error is DioException) {
      return handleDioError(error);
    }
    
    if (error is ServerException) {
      return _translateMessage(error.message);
    }
    
    if (error is NetworkException) {
      return error.message;
    }
    
    if (error is AuthException) {
      return _translateMessage(error.message);
    }
    
    if (error is LocationException) {
      return error.message;
    }

    if (error is String) {
      if (_isCodeMessage(error)) {
        return defaultMessage ?? 'حدث خطأ غير متوقع';
      }
      return _translateMessage(error);
    }

    return defaultMessage ?? 'حدث خطأ غير متوقع. حاول مرة أخرى';
  }
}

