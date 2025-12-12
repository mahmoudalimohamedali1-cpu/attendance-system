import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<Either<Failure, AuthResult>> login({
    required String email,
    required String password,
    bool rememberMe = false,
  });

  Future<Either<Failure, AuthResult>> refreshToken(String refreshToken);

  Future<Either<Failure, void>> logout();

  Future<Either<Failure, void>> forgotPassword(String email);

  Future<Either<Failure, void>> resetPassword({
    required String token,
    required String newPassword,
  });

  Future<Either<Failure, void>> updateFcmToken(String fcmToken);

  Future<Either<Failure, UserEntity>> getProfile();

  Future<Either<Failure, UserEntity>> updateProfile(Map<String, dynamic> data);

  Future<Either<Failure, void>> changePassword({
    required String oldPassword,
    required String newPassword,
  });

  Future<bool> isLoggedIn();

  Future<UserEntity?> getCachedUser();
}

class AuthResult {
  final UserEntity user;
  final String accessToken;
  final String refreshToken;
  final String expiresIn;

  AuthResult({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });
}

