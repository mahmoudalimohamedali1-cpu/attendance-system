import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.email,
    super.phone,
    required super.firstName,
    required super.lastName,
    super.avatar,
    super.employeeCode,
    super.jobTitle,
    required super.role,
    required super.status,
    super.branch,
    super.department,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      avatar: json['avatar'] as String?,
      employeeCode: json['employeeCode'] as String?,
      jobTitle: json['jobTitle'] as String?,
      role: json['role'] as String,
      status: json['status'] as String,
      branch: json['branch'] != null
          ? BranchModel.fromJson(json['branch'] as Map<String, dynamic>)
          : null,
      department: json['department'] != null
          ? DepartmentModel.fromJson(json['department'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'firstName': firstName,
      'lastName': lastName,
      'avatar': avatar,
      'employeeCode': employeeCode,
      'jobTitle': jobTitle,
      'role': role,
      'status': status,
      'branch': branch != null ? (branch as BranchModel).toJson() : null,
      'department':
          department != null ? (department as DepartmentModel).toJson() : null,
    };
  }
}

class BranchModel extends BranchEntity {
  const BranchModel({
    required super.id,
    required super.name,
    super.nameEn,
    required super.latitude,
    required super.longitude,
    required super.geofenceRadius,
    required super.workStartTime,
    required super.workEndTime,
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    return BranchModel(
      id: json['id'] as String,
      name: json['name'] as String,
      nameEn: json['nameEn'] as String?,
      latitude: double.tryParse(json['latitude'].toString()) ?? 0.0,
      longitude: double.tryParse(json['longitude'].toString()) ?? 0.0,
      geofenceRadius: json['geofenceRadius'] as int? ?? 100,
      workStartTime: json['workStartTime'] as String? ?? '09:00',
      workEndTime: json['workEndTime'] as String? ?? '17:00',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nameEn': nameEn,
      'latitude': latitude,
      'longitude': longitude,
      'geofenceRadius': geofenceRadius,
      'workStartTime': workStartTime,
      'workEndTime': workEndTime,
    };
  }
}

class DepartmentModel extends DepartmentEntity {
  const DepartmentModel({
    required super.id,
    required super.name,
    super.nameEn,
  });

  factory DepartmentModel.fromJson(Map<String, dynamic> json) {
    return DepartmentModel(
      id: json['id'] as String,
      name: json['name'] as String,
      nameEn: json['nameEn'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nameEn': nameEn,
    };
  }
}

