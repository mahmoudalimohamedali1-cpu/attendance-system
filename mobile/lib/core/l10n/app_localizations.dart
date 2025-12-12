import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static final Map<String, Map<String, String>> _localizedValues = {
    'ar': {
      // General
      'app_name': 'نظام الحضور',
      'loading': 'جاري التحميل...',
      'error': 'حدث خطأ',
      'success': 'تمت العملية بنجاح',
      'cancel': 'إلغاء',
      'confirm': 'تأكيد',
      'save': 'حفظ',
      'delete': 'حذف',
      'edit': 'تعديل',
      'close': 'إغلاق',
      'back': 'رجوع',
      'next': 'التالي',
      'done': 'تم',
      'retry': 'إعادة المحاولة',
      'no_data': 'لا توجد بيانات',
      
      // Auth
      'login': 'تسجيل الدخول',
      'logout': 'تسجيل الخروج',
      'email': 'البريد الإلكتروني',
      'password': 'كلمة المرور',
      'remember_me': 'تذكرني',
      'forgot_password': 'نسيت كلمة المرور؟',
      'login_success': 'تم تسجيل الدخول بنجاح',
      'login_failed': 'فشل تسجيل الدخول',
      'invalid_credentials': 'بيانات الدخول غير صحيحة',
      'change_password': 'تغيير كلمة المرور',
      'old_password': 'كلمة المرور الحالية',
      'new_password': 'كلمة المرور الجديدة',
      'confirm_password': 'تأكيد كلمة المرور',
      
      // Home
      'home': 'الرئيسية',
      'welcome': 'مرحباً',
      'today': 'اليوم',
      'check_in': 'تسجيل الحضور',
      'check_out': 'تسجيل الانصراف',
      'checked_in': 'تم تسجيل الحضور',
      'checked_out': 'تم تسجيل الانصراف',
      'not_checked_in': 'لم تسجل الحضور بعد',
      'check_in_success': 'تم تسجيل الحضور بنجاح',
      'check_out_success': 'تم تسجيل الانصراف بنجاح',
      
      // Attendance
      'attendance': 'الحضور',
      'attendance_history': 'سجل الحضور',
      'monthly_stats': 'إحصائيات الشهر',
      'present': 'حاضر',
      'late': 'متأخر',
      'early_leave': 'انصراف مبكر',
      'absent': 'غائب',
      'on_leave': 'إجازة',
      'work_from_home': 'عمل من المنزل',
      'total_working_hours': 'إجمالي ساعات العمل',
      'late_minutes': 'دقائق التأخير',
      'overtime_minutes': 'الساعات الإضافية',
      
      // Location
      'location_required': 'يرجى تفعيل الموقع',
      'outside_geofence': 'أنت خارج نطاق موقع الشركة',
      'mock_location_detected': 'تم رصد استخدام موقع وهمي',
      'location_permission_denied': 'تم رفض صلاحية الموقع',
      
      // Leaves
      'leaves': 'الإجازات',
      'leave_requests': 'طلبات الإجازة',
      'new_leave_request': 'طلب إجازة جديد',
      'leave_type': 'نوع الإجازة',
      'annual_leave': 'إجازة سنوية',
      'sick_leave': 'إجازة مرضية',
      'personal_leave': 'إجازة شخصية',
      'emergency_leave': 'إجازة طارئة',
      'early_leave_request': 'خروج مبكر',
      'start_date': 'تاريخ البداية',
      'end_date': 'تاريخ النهاية',
      'reason': 'السبب',
      'pending': 'قيد المراجعة',
      'approved': 'موافق عليه',
      'rejected': 'مرفوض',
      'cancelled': 'ملغي',
      
      // Notifications
      'notifications': 'الإشعارات',
      'no_notifications': 'لا توجد إشعارات',
      'mark_all_read': 'تعليم الكل كمقروء',
      
      // Profile
      'profile': 'الملف الشخصي',
      'personal_info': 'المعلومات الشخصية',
      'full_name': 'الاسم الكامل',
      'phone': 'رقم الهاتف',
      'employee_code': 'رقم الموظف',
      'job_title': 'المسمى الوظيفي',
      'department': 'القسم',
      'branch': 'الفرع',
      
      // Settings
      'settings': 'الإعدادات',
      'language': 'اللغة',
      'arabic': 'العربية',
      'english': 'English',
      'theme': 'المظهر',
      'light_theme': 'فاتح',
      'dark_theme': 'داكن',
      'system_theme': 'حسب النظام',
      'about': 'عن التطبيق',
      'version': 'الإصدار',
    },
    'en': {
      // General
      'app_name': 'Attendance System',
      'loading': 'Loading...',
      'error': 'Error occurred',
      'success': 'Operation successful',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'save': 'Save',
      'delete': 'Delete',
      'edit': 'Edit',
      'close': 'Close',
      'back': 'Back',
      'next': 'Next',
      'done': 'Done',
      'retry': 'Retry',
      'no_data': 'No data',
      
      // Auth
      'login': 'Login',
      'logout': 'Logout',
      'email': 'Email',
      'password': 'Password',
      'remember_me': 'Remember me',
      'forgot_password': 'Forgot password?',
      'login_success': 'Login successful',
      'login_failed': 'Login failed',
      'invalid_credentials': 'Invalid credentials',
      'change_password': 'Change Password',
      'old_password': 'Current Password',
      'new_password': 'New Password',
      'confirm_password': 'Confirm Password',
      
      // Home
      'home': 'Home',
      'welcome': 'Welcome',
      'today': 'Today',
      'check_in': 'Check In',
      'check_out': 'Check Out',
      'checked_in': 'Checked In',
      'checked_out': 'Checked Out',
      'not_checked_in': 'Not checked in yet',
      'check_in_success': 'Check-in successful',
      'check_out_success': 'Check-out successful',
      
      // Attendance
      'attendance': 'Attendance',
      'attendance_history': 'Attendance History',
      'monthly_stats': 'Monthly Statistics',
      'present': 'Present',
      'late': 'Late',
      'early_leave': 'Early Leave',
      'absent': 'Absent',
      'on_leave': 'On Leave',
      'work_from_home': 'Work From Home',
      'total_working_hours': 'Total Working Hours',
      'late_minutes': 'Late Minutes',
      'overtime_minutes': 'Overtime Minutes',
      
      // Location
      'location_required': 'Please enable location',
      'outside_geofence': 'You are outside company location',
      'mock_location_detected': 'Mock location detected',
      'location_permission_denied': 'Location permission denied',
      
      // Leaves
      'leaves': 'Leaves',
      'leave_requests': 'Leave Requests',
      'new_leave_request': 'New Leave Request',
      'leave_type': 'Leave Type',
      'annual_leave': 'Annual Leave',
      'sick_leave': 'Sick Leave',
      'personal_leave': 'Personal Leave',
      'emergency_leave': 'Emergency Leave',
      'early_leave_request': 'Early Leave',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      'reason': 'Reason',
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled',
      
      // Notifications
      'notifications': 'Notifications',
      'no_notifications': 'No notifications',
      'mark_all_read': 'Mark all as read',
      
      // Profile
      'profile': 'Profile',
      'personal_info': 'Personal Information',
      'full_name': 'Full Name',
      'phone': 'Phone Number',
      'employee_code': 'Employee Code',
      'job_title': 'Job Title',
      'department': 'Department',
      'branch': 'Branch',
      
      // Settings
      'settings': 'Settings',
      'language': 'Language',
      'arabic': 'العربية',
      'english': 'English',
      'theme': 'Theme',
      'light_theme': 'Light',
      'dark_theme': 'Dark',
      'system_theme': 'System',
      'about': 'About',
      'version': 'Version',
    },
  };

  String translate(String key) {
    return _localizedValues[locale.languageCode]?[key] ?? key;
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['ar', 'en'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

extension AppLocalizationsExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String tr(String key) => AppLocalizations.of(this).translate(key);
}

