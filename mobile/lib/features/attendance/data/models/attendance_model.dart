import '../../domain/entities/attendance_entity.dart';

class AttendanceModel extends AttendanceEntity {
  const AttendanceModel({
    required super.id,
    required super.userId,
    required super.branchId,
    required super.date,
    super.checkInTime,
    super.checkOutTime,
    required super.status,
    super.lateMinutes = 0,
    super.earlyLeaveMinutes = 0,
    super.workingMinutes = 0,
    super.overtimeMinutes = 0,
    super.isWorkFromHome = false,
    super.notes,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      branchId: json['branchId'] as String,
      date: DateTime.parse(json['date'] as String),
      checkInTime: json['checkInTime'] != null
          ? DateTime.parse(json['checkInTime'] as String)
          : null,
      checkOutTime: json['checkOutTime'] != null
          ? DateTime.parse(json['checkOutTime'] as String)
          : null,
      status: json['status'] as String,
      lateMinutes: json['lateMinutes'] as int? ?? 0,
      earlyLeaveMinutes: json['earlyLeaveMinutes'] as int? ?? 0,
      workingMinutes: json['workingMinutes'] as int? ?? 0,
      overtimeMinutes: json['overtimeMinutes'] as int? ?? 0,
      isWorkFromHome: json['isWorkFromHome'] as bool? ?? false,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'branchId': branchId,
      'date': date.toIso8601String(),
      'checkInTime': checkInTime?.toIso8601String(),
      'checkOutTime': checkOutTime?.toIso8601String(),
      'status': status,
      'lateMinutes': lateMinutes,
      'earlyLeaveMinutes': earlyLeaveMinutes,
      'workingMinutes': workingMinutes,
      'overtimeMinutes': overtimeMinutes,
      'isWorkFromHome': isWorkFromHome,
      'notes': notes,
    };
  }
}

class CheckInResponseModel {
  final String message;
  final AttendanceModel attendance;
  final int lateMinutes;
  final bool isLate;

  CheckInResponseModel({
    required this.message,
    required this.attendance,
    required this.lateMinutes,
    required this.isLate,
  });

  factory CheckInResponseModel.fromJson(Map<String, dynamic> json) {
    return CheckInResponseModel(
      message: json['message'] as String,
      attendance: AttendanceModel.fromJson(json['attendance'] as Map<String, dynamic>),
      lateMinutes: json['lateMinutes'] as int? ?? 0,
      isLate: json['isLate'] as bool? ?? false,
    );
  }
}

class CheckOutResponseModel {
  final String message;
  final AttendanceModel attendance;
  final int earlyLeaveMinutes;
  final bool isEarlyLeave;
  final int workingMinutes;
  final int overtimeMinutes;

  CheckOutResponseModel({
    required this.message,
    required this.attendance,
    required this.earlyLeaveMinutes,
    required this.isEarlyLeave,
    required this.workingMinutes,
    required this.overtimeMinutes,
  });

  factory CheckOutResponseModel.fromJson(Map<String, dynamic> json) {
    return CheckOutResponseModel(
      message: json['message'] as String,
      attendance: AttendanceModel.fromJson(json['attendance'] as Map<String, dynamic>),
      earlyLeaveMinutes: json['earlyLeaveMinutes'] as int? ?? 0,
      isEarlyLeave: json['isEarlyLeave'] as bool? ?? false,
      workingMinutes: json['workingMinutes'] as int? ?? 0,
      overtimeMinutes: json['overtimeMinutes'] as int? ?? 0,
    );
  }
}

class TodayAttendanceResponseModel {
  final AttendanceModel? attendance;
  final WorkScheduleModel workSchedule;

  TodayAttendanceResponseModel({
    this.attendance,
    required this.workSchedule,
  });

  factory TodayAttendanceResponseModel.fromJson(Map<String, dynamic> json) {
    return TodayAttendanceResponseModel(
      attendance: json['attendance'] != null
          ? AttendanceModel.fromJson(json['attendance'] as Map<String, dynamic>)
          : null,
      workSchedule: WorkScheduleModel.fromJson(json['workSchedule'] as Map<String, dynamic>),
    );
  }
}

class WorkScheduleModel {
  final String startTime;
  final String endTime;
  final int lateGracePeriod;
  final int earlyCheckInPeriod;

  WorkScheduleModel({
    required this.startTime,
    required this.endTime,
    required this.lateGracePeriod,
    required this.earlyCheckInPeriod,
  });

  factory WorkScheduleModel.fromJson(Map<String, dynamic> json) {
    return WorkScheduleModel(
      startTime: json['startTime'] as String? ?? '09:00',
      endTime: json['endTime'] as String? ?? '17:00',
      lateGracePeriod: json['lateGracePeriod'] as int? ?? 10,
      earlyCheckInPeriod: json['earlyCheckInPeriod'] as int? ?? 15,
    );
  }
}

class AttendanceHistoryResponseModel {
  final List<AttendanceModel> data;
  final PaginationModel pagination;

  AttendanceHistoryResponseModel({
    required this.data,
    required this.pagination,
  });

  factory AttendanceHistoryResponseModel.fromJson(Map<String, dynamic> json) {
    return AttendanceHistoryResponseModel(
      data: (json['data'] as List)
          .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationModel.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }
}

class PaginationModel {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  PaginationModel({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory PaginationModel.fromJson(Map<String, dynamic> json) {
    return PaginationModel(
      page: json['page'] as int,
      limit: json['limit'] as int,
      total: json['total'] as int,
      totalPages: json['totalPages'] as int,
    );
  }
}

class MonthlyStatsResponseModel {
  final int year;
  final int month;
  final AttendanceStatsModel stats;
  final List<AttendanceModel> attendances;

  MonthlyStatsResponseModel({
    required this.year,
    required this.month,
    required this.stats,
    required this.attendances,
  });

  factory MonthlyStatsResponseModel.fromJson(Map<String, dynamic> json) {
    return MonthlyStatsResponseModel(
      year: json['year'] as int,
      month: json['month'] as int,
      stats: AttendanceStatsModel.fromJson(json['stats'] as Map<String, dynamic>),
      attendances: (json['attendances'] as List)
          .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class AttendanceStatsModel extends AttendanceStats {
  const AttendanceStatsModel({
    super.totalDays = 0,
    super.presentDays = 0,
    super.lateDays = 0,
    super.earlyLeaveDays = 0,
    super.absentDays = 0,
    super.onLeaveDays = 0,
    super.workFromHomeDays = 0,
    super.totalWorkingMinutes = 0,
    super.totalLateMinutes = 0,
    super.totalOvertimeMinutes = 0,
    super.totalEarlyLeaveMinutes = 0,
  });

  factory AttendanceStatsModel.fromJson(Map<String, dynamic> json) {
    return AttendanceStatsModel(
      totalDays: json['totalDays'] as int? ?? 0,
      presentDays: json['presentDays'] as int? ?? 0,
      lateDays: json['lateDays'] as int? ?? 0,
      earlyLeaveDays: json['earlyLeaveDays'] as int? ?? 0,
      absentDays: json['absentDays'] as int? ?? 0,
      onLeaveDays: json['onLeaveDays'] as int? ?? 0,
      workFromHomeDays: json['workFromHomeDays'] as int? ?? 0,
      totalWorkingMinutes: json['totalWorkingMinutes'] as int? ?? 0,
      totalLateMinutes: json['totalLateMinutes'] as int? ?? 0,
      totalOvertimeMinutes: json['totalOvertimeMinutes'] as int? ?? 0,
      totalEarlyLeaveMinutes: json['totalEarlyLeaveMinutes'] as int? ?? 0,
    );
  }
}

