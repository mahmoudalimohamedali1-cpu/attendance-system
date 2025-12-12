import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/error/exceptions.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../datasources/attendance_remote_datasource.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource _remoteDataSource;

  AttendanceRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, CheckInResult>> checkIn({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    try {
      final response = await _remoteDataSource.checkIn(
        latitude: latitude,
        longitude: longitude,
        isMockLocation: isMockLocation,
        deviceInfo: deviceInfo,
        faceEmbedding: faceEmbedding,
        faceImage: faceImage,
      );

      return Right(CheckInResult(
        attendance: response.attendance,
        lateMinutes: response.lateMinutes,
        isLate: response.isLate,
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure('فشل تسجيل الحضور: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, CheckOutResult>> checkOut({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    try {
      final response = await _remoteDataSource.checkOut(
        latitude: latitude,
        longitude: longitude,
        isMockLocation: isMockLocation,
        deviceInfo: deviceInfo,
        notes: notes,
        faceEmbedding: faceEmbedding,
        faceImage: faceImage,
      );

      return Right(CheckOutResult(
        attendance: response.attendance,
        earlyLeaveMinutes: response.earlyLeaveMinutes,
        isEarlyLeave: response.isEarlyLeave,
        workingMinutes: response.workingMinutes,
        overtimeMinutes: response.overtimeMinutes,
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure('فشل تسجيل الانصراف: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, TodayAttendanceResult>> getTodayAttendance() async {
    try {
      final response = await _remoteDataSource.getTodayAttendance();

      return Right(TodayAttendanceResult(
        attendance: response.attendance,
        workSchedule: WorkSchedule(
          startTime: response.workSchedule.startTime,
          endTime: response.workSchedule.endTime,
          lateGracePeriod: response.workSchedule.lateGracePeriod,
          earlyCheckInPeriod: response.workSchedule.earlyCheckInPeriod,
        ),
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل جلب بيانات الحضور'));
    }
  }

  @override
  Future<Either<Failure, AttendanceHistoryResult>> getAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final response = await _remoteDataSource.getAttendanceHistory(
        startDate: startDate,
        endDate: endDate,
        status: status,
        page: page,
        limit: limit,
      );

      return Right(AttendanceHistoryResult(
        data: response.data,
        total: response.pagination.total,
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل جلب سجل الحضور'));
    }
  }

  @override
  Future<Either<Failure, MonthlyStatsResult>> getMonthlyStats({
    required int year,
    required int month,
  }) async {
    try {
      final response = await _remoteDataSource.getMonthlyStats(
        year: year,
        month: month,
      );

      return Right(MonthlyStatsResult(
        year: response.year,
        month: response.month,
        stats: response.stats,
        attendances: response.attendances,
      ));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('فشل جلب الإحصائيات'));
    }
  }
}

