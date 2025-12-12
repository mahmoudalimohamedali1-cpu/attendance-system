import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/auth_repository.dart';

class RefreshTokenUseCase {
  final AuthRepository repository;

  RefreshTokenUseCase(this.repository);

  Future<Either<Failure, AuthResult>> call(String refreshToken) async {
    if (refreshToken.isEmpty) {
      return const Left(AuthFailure('Refresh token مطلوب'));
    }

    return await repository.refreshToken(refreshToken);
  }
}

