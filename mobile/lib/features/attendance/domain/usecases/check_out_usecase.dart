import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/attendance_repository.dart';

class CheckOutUseCase {
  final AttendanceRepository repository;

  CheckOutUseCase(this.repository);

  Future<Either<Failure, CheckOutResult>> call({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    if (latitude < -90 || latitude > 90) {
      return const Left(ValidationFailure('خط العرض غير صالح'));
    }

    if (longitude < -180 || longitude > 180) {
      return const Left(ValidationFailure('خط الطول غير صالح'));
    }

    // فحص الموقع الوهمي - مفعل
    if (isMockLocation) {
      return const Left(MockLocationFailure('تم رصد استخدام موقع وهمي. لا يمكن تسجيل الانصراف.'));
    }

    return await repository.checkOut(
      latitude: latitude,
      longitude: longitude,
      isMockLocation: isMockLocation,
      deviceInfo: deviceInfo,
      notes: notes,
      faceEmbedding: faceEmbedding,
      faceImage: faceImage,
    );
  }
}

