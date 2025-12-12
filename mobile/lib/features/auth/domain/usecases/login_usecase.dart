import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository repository;

  LoginUseCase(this.repository);

  Future<Either<Failure, AuthResult>> call({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    // Validate input
    if (email.isEmpty) {
      return const Left(ValidationFailure('البريد الإلكتروني مطلوب'));
    }

    if (password.isEmpty) {
      return const Left(ValidationFailure('كلمة المرور مطلوبة'));
    }

    if (password.length < 6) {
      return const Left(ValidationFailure('كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
    }

    return await repository.login(
      email: email,
      password: password,
      rememberMe: rememberMe,
    );
  }
}

