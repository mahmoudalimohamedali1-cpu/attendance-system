import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String? phone;
  final String firstName;
  final String lastName;
  final String? avatar;
  final String? employeeCode;
  final String? jobTitle;
  final String role;
  final String status;
  final BranchEntity? branch;
  final DepartmentEntity? department;

  const UserEntity({
    required this.id,
    required this.email,
    this.phone,
    required this.firstName,
    required this.lastName,
    this.avatar,
    this.employeeCode,
    this.jobTitle,
    required this.role,
    required this.status,
    this.branch,
    this.department,
  });

  String get fullName => '$firstName $lastName';

  bool get isAdmin => role == 'ADMIN';
  bool get isManager => role == 'MANAGER';
  bool get isEmployee => role == 'EMPLOYEE';
  bool get isActive => status == 'ACTIVE';

  @override
  List<Object?> get props => [
        id,
        email,
        phone,
        firstName,
        lastName,
        avatar,
        employeeCode,
        jobTitle,
        role,
        status,
        branch,
        department,
      ];
}

class BranchEntity extends Equatable {
  final String id;
  final String name;
  final String? nameEn;
  final double latitude;
  final double longitude;
  final int geofenceRadius;
  final String workStartTime;
  final String workEndTime;

  const BranchEntity({
    required this.id,
    required this.name,
    this.nameEn,
    required this.latitude,
    required this.longitude,
    required this.geofenceRadius,
    required this.workStartTime,
    required this.workEndTime,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        nameEn,
        latitude,
        longitude,
        geofenceRadius,
        workStartTime,
        workEndTime,
      ];
}

class DepartmentEntity extends Equatable {
  final String id;
  final String name;
  final String? nameEn;

  const DepartmentEntity({
    required this.id,
    required this.name,
    this.nameEn,
  });

  @override
  List<Object?> get props => [id, name, nameEn];
}

