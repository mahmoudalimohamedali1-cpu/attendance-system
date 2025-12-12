import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<LoginResponse> login({
    required String email,
    required String password,
  });

  Future<LoginResponse> refreshToken(String refreshToken);

  Future<void> logout(String? refreshToken);

  Future<void> forgotPassword(String email);

  Future<void> updateFcmToken(String fcmToken);

  Future<UserModel> getProfile();

  Future<UserModel> updateProfile(Map<String, dynamic> data);

  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  });
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl(this._apiClient);

  @override
  Future<LoginResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.login({
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        return LoginResponse.fromJson(response.data);
      }

      // Handle non-200 status codes
      final errorMessage = response.data is Map
          ? (response.data['message'] ?? response.data['error'] ?? 'فشل تسجيل الدخول')
          : 'فشل تسجيل الدخول';
      
      throw ServerException(
        message: errorMessage.toString(),
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      // Handle Dio-specific errors
      String errorMessage = 'فشل تسجيل الدخول';
      
      if (e.response != null) {
        // Server responded with error
        final statusCode = e.response!.statusCode;
        final data = e.response!.data;
        
        if (data is Map) {
          errorMessage = data['message'] ?? 
                        data['error'] ?? 
                        _getErrorMessageFromStatusCode(statusCode);
        } else {
          errorMessage = _getErrorMessageFromStatusCode(statusCode);
        }
      } else {
        // Network or connection error
        switch (e.type) {
          case DioExceptionType.connectionTimeout:
          case DioExceptionType.sendTimeout:
          case DioExceptionType.receiveTimeout:
            errorMessage = 'انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت';
            break;
          case DioExceptionType.badResponse:
            errorMessage = 'خطأ في استجابة السيرفر';
            break;
          case DioExceptionType.cancel:
            errorMessage = 'تم إلغاء الطلب';
            break;
          case DioExceptionType.connectionError:
            errorMessage = 'لا يمكن الاتصال بالسيرفر. تحقق من عنوان السيرفر واتصالك بالإنترنت';
            break;
          case DioExceptionType.badCertificate:
            errorMessage = 'خطأ في شهادة الاتصال الآمن';
            break;
          case DioExceptionType.unknown:
          default:
            errorMessage = 'خطأ غير معروف: ${e.message ?? "تحقق من اتصالك بالإنترنت"}';
            break;
        }
      }
      
      throw ServerException(
        message: errorMessage,
        statusCode: e.response?.statusCode,
      );
    } on ServerException {
      rethrow;
    } catch (e) {
      throw ServerException(
        message: 'فشل تسجيل الدخول: ${e.toString()}',
      );
    }
  }

  String _getErrorMessageFromStatusCode(int? statusCode) {
    switch (statusCode) {
      case 400:
        return 'بيانات غير صحيحة';
      case 401:
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      case 403:
        return 'غير مصرح لك بالدخول';
      case 404:
        return 'السيرفر غير موجود';
      case 500:
        return 'خطأ في السيرفر. حاول مرة أخرى لاحقاً';
      case 503:
        return 'السيرفر غير متاح حالياً';
      default:
        return 'فشل تسجيل الدخول';
    }
  }

  @override
  Future<LoginResponse> refreshToken(String refreshToken) async {
    try {
      final response = await _apiClient.refreshToken(refreshToken);

      if (response.statusCode == 200) {
        return LoginResponse.fromJson(response.data);
      }

      throw AuthException(message: 'فشل تجديد التوكن');
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException(message: 'فشل تجديد التوكن');
    }
  }

  @override
  Future<void> logout(String? refreshToken) async {
    try {
      await _apiClient.logout(refreshToken);
    } catch (e) {
      // Silently fail logout
    }
  }

  @override
  Future<void> forgotPassword(String email) async {
    try {
      final response = await _apiClient.forgotPassword(email);

      if (response.statusCode != 200) {
        throw ServerException(
          message: response.data['message'] ?? 'فشل إرسال رابط إعادة التعيين',
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل إرسال رابط إعادة التعيين');
    }
  }

  @override
  Future<void> updateFcmToken(String fcmToken) async {
    try {
      await _apiClient.updateFcmToken(fcmToken);
    } catch (e) {
      // Silently fail FCM token update
    }
  }

  @override
  Future<UserModel> getProfile() async {
    try {
      final response = await _apiClient.getProfile();

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل جلب البيانات',
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل جلب بيانات المستخدم');
    }
  }

  @override
  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.updateProfile(data);

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل تحديث البيانات',
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل تحديث بيانات المستخدم');
    }
  }

  @override
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.changePassword({
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      });

      if (response.statusCode != 200) {
        throw ServerException(
          message: response.data['message'] ?? 'فشل تغيير كلمة المرور',
        );
      }
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل تغيير كلمة المرور');
    }
  }
}

class LoginResponse {
  final UserModel user;
  final String accessToken;
  final String refreshToken;
  final String expiresIn;

  LoginResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: json['expiresIn'] as String? ?? '15m',
    );
  }
}

