import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/attendance_repository.dart';

class GetTodayAttendanceUseCase {
  final AttendanceRepository repository;

  GetTodayAttendanceUseCase(this.repository);

  Future<Either<Failure, TodayAttendanceResult>> call() async {
    return await repository.getTodayAttendance();
  }
}

