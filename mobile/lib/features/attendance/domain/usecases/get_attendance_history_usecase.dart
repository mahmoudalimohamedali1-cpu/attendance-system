import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/attendance_repository.dart';

class GetAttendanceHistoryUseCase {
  final AttendanceRepository repository;

  GetAttendanceHistoryUseCase(this.repository);

  Future<Either<Failure, AttendanceHistoryResult>> call({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 30,
  }) async {
    return await repository.getAttendanceHistory(
      startDate: startDate,
      endDate: endDate,
      status: status,
      page: page,
      limit: limit,
    );
  }
}

