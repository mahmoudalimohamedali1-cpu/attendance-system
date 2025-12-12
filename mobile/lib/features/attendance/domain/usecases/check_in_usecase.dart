import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/attendance_repository.dart';

class CheckInUseCase {
  final AttendanceRepository repository;

  CheckInUseCase(this.repository);

  Future<Either<Failure, CheckInResult>> call({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return const Left(ValidationFailure('خط العرض غير صالح'));
    }

    if (longitude < -180 || longitude > 180) {
      return const Left(ValidationFailure('خط الطول غير صالح'));
    }

    // فحص الموقع الوهمي - مفعل
    if (isMockLocation) {
      return const Left(MockLocationFailure('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الحضور.'));
    }

    return await repository.checkIn(
      latitude: latitude,
      longitude: longitude,
      isMockLocation: isMockLocation,
      deviceInfo: deviceInfo,
      faceEmbedding: faceEmbedding,
      faceImage: faceImage,
    );
  }
}

