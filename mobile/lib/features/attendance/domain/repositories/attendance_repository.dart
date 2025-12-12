import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/attendance_entity.dart';

abstract class AttendanceRepository {
  Future<Either<Failure, CheckInResult>> checkIn({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  });

  Future<Either<Failure, CheckOutResult>> checkOut({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
  });

  Future<Either<Failure, TodayAttendanceResult>> getTodayAttendance();

  Future<Either<Failure, AttendanceHistoryResult>> getAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 30,
  });

  Future<Either<Failure, MonthlyStatsResult>> getMonthlyStats({
    required int year,
    required int month,
  });
}

class CheckInResult {
  final AttendanceEntity attendance;
  final int lateMinutes;
  final bool isLate;

  CheckInResult({
    required this.attendance,
    required this.lateMinutes,
    required this.isLate,
  });
}

class CheckOutResult {
  final AttendanceEntity attendance;
  final int earlyLeaveMinutes;
  final bool isEarlyLeave;
  final int workingMinutes;
  final int overtimeMinutes;

  CheckOutResult({
    required this.attendance,
    required this.earlyLeaveMinutes,
    required this.isEarlyLeave,
    required this.workingMinutes,
    required this.overtimeMinutes,
  });
}

class TodayAttendanceResult {
  final AttendanceEntity? attendance;
  final WorkSchedule workSchedule;

  TodayAttendanceResult({
    this.attendance,
    required this.workSchedule,
  });
}

class WorkSchedule {
  final String startTime;
  final String endTime;
  final int lateGracePeriod;
  final int earlyCheckInPeriod;

  WorkSchedule({
    required this.startTime,
    required this.endTime,
    required this.lateGracePeriod,
    required this.earlyCheckInPeriod,
  });
}

class AttendanceHistoryResult {
  final List<AttendanceEntity> data;
  final int total;
  final int page;
  final int totalPages;

  AttendanceHistoryResult({
    required this.data,
    required this.total,
    required this.page,
    required this.totalPages,
  });
}

class MonthlyStatsResult {
  final int year;
  final int month;
  final AttendanceStats stats;
  final List<AttendanceEntity> attendances;

  MonthlyStatsResult({
    required this.year,
    required this.month,
    required this.stats,
    required this.attendances,
  });
}

