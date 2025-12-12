import 'package:equatable/equatable.dart';

class AttendanceEntity extends Equatable {
  final String id;
  final String userId;
  final String branchId;
  final DateTime date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final String status;
  final int lateMinutes;
  final int earlyLeaveMinutes;
  final int workingMinutes;
  final int overtimeMinutes;
  final bool isWorkFromHome;
  final String? notes;

  const AttendanceEntity({
    required this.id,
    required this.userId,
    required this.branchId,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    required this.status,
    this.lateMinutes = 0,
    this.earlyLeaveMinutes = 0,
    this.workingMinutes = 0,
    this.overtimeMinutes = 0,
    this.isWorkFromHome = false,
    this.notes,
  });

  @override
  List<Object?> get props => [
        id,
        userId,
        branchId,
        date,
        checkInTime,
        checkOutTime,
        status,
        lateMinutes,
        earlyLeaveMinutes,
        workingMinutes,
        overtimeMinutes,
        isWorkFromHome,
        notes,
      ];
}

class AttendanceStats extends Equatable {
  final int totalDays;
  final int presentDays;
  final int lateDays;
  final int earlyLeaveDays;
  final int absentDays;
  final int onLeaveDays;
  final int workFromHomeDays;
  final int totalWorkingMinutes;
  final int totalLateMinutes;
  final int totalOvertimeMinutes;
  final int totalEarlyLeaveMinutes;

  const AttendanceStats({
    this.totalDays = 0,
    this.presentDays = 0,
    this.lateDays = 0,
    this.earlyLeaveDays = 0,
    this.absentDays = 0,
    this.onLeaveDays = 0,
    this.workFromHomeDays = 0,
    this.totalWorkingMinutes = 0,
    this.totalLateMinutes = 0,
    this.totalOvertimeMinutes = 0,
    this.totalEarlyLeaveMinutes = 0,
  });

  @override
  List<Object?> get props => [
        totalDays,
        presentDays,
        lateDays,
        earlyLeaveDays,
        absentDays,
        onLeaveDays,
        workFromHomeDays,
        totalWorkingMinutes,
        totalLateMinutes,
        totalOvertimeMinutes,
        totalEarlyLeaveMinutes,
      ];
}

