import 'dart:convert';
import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/services/storage_service.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final StorageService _storageService;

  AuthRepositoryImpl(this._remoteDataSource, this._storageService);

  @override
  Future<Either<Failure, AuthResult>> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      final response = await _remoteDataSource.login(
        email: email,
        password: password,
      );

      // Save tokens
      await _storageService.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );

      // Save user data
      await _storageService.saveUserData(jsonEncode(response.user.toJson()));

      // Save remember me preference
      if (rememberMe) {
        await _storageService.setRememberMe(true);
        await _storageService.setLastEmail(email);
      }

      return Right(AuthResult(
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      ));
    } on ServerException catch (e) {
      // Check if it's a network/connection error
      if (e.statusCode == null || 
          e.message.contains('الاتصال') || 
          e.message.contains('السيرفر') ||
          e.message.contains('timeout') ||
          e.message.contains('connection')) {
        return Left(NetworkFailure(e.message));
      }
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthException catch (e) {
      return Left(AuthFailure(e.message));
    } catch (e) {
      // Check if it's a network error
      final errorString = e.toString().toLowerCase();
      if (errorString.contains('socket') || 
          errorString.contains('connection') ||
          errorString.contains('network') ||
          errorString.contains('timeout')) {
        return Left(NetworkFailure('لا يمكن الاتصال بالسيرفر. تحقق من اتصالك بالإنترنت'));
      }
      return Left(ServerFailure('فشل تسجيل الدخول: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, AuthResult>> refreshToken(String refreshToken) async {
    try {
      final response = await _remoteDataSource.refreshToken(refreshToken);

      await _storageService.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );

      return Right(AuthResult(
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      ));
    } on AuthException catch (e) {
      await _storageService.clearAll();
      return Left(AuthFailure(e.message));
    } catch (e) {
      return Left(AuthFailure('فشل تجديد التوكن'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      final refreshToken = await _storageService.getRefreshToken();
      await _remoteDataSource.logout(refreshToken);
      await _storageService.clearAll();
      return const Right(null);
    } catch (e) {
      await _storageService.clearAll();
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> forgotPassword(String email) async {
    try {
      await _remoteDataSource.forgotPassword(email);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل إرسال رابط إعادة التعيين'));
    }
  }

  @override
  Future<Either<Failure, void>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    // TODO: Implement reset password
    return const Left(ServerFailure('هذه الميزة قيد التطوير'));
  }

  @override
  Future<Either<Failure, void>> updateFcmToken(String fcmToken) async {
    try {
      await _remoteDataSource.updateFcmToken(fcmToken);
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure('فشل تحديث FCM token'));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getProfile() async {
    try {
      final user = await _remoteDataSource.getProfile();
      await _storageService.saveUserData(jsonEncode(user.toJson()));
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل جلب بيانات المستخدم'));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> updateProfile(
    Map<String, dynamic> data,
  ) async {
    try {
      final user = await _remoteDataSource.updateProfile(data);
      await _storageService.saveUserData(jsonEncode(user.toJson()));
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل تحديث بيانات المستخدم'));
    }
  }

  @override
  Future<Either<Failure, void>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      await _remoteDataSource.changePassword(
        oldPassword: oldPassword,
        newPassword: newPassword,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل تغيير كلمة المرور'));
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    final token = await _storageService.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  @override
  Future<UserEntity?> getCachedUser() async {
    final userData = await _storageService.getUserData();
    if (userData == null) return null;

    try {
      final json = jsonDecode(userData) as Map<String, dynamic>;
      return UserModel.fromJson(json);
    } catch (e) {
      return null;
    }
  }
}

