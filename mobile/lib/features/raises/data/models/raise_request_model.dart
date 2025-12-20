// lib/features/raises/data/models/raise_request_model.dart
import '../../domain/entities/raise_request.dart';

class RaiseRequestModel extends RaiseRequest {
  const RaiseRequestModel({
    required super.id,
    required super.userId,
    required super.type,
    required super.amount,
    required super.effectiveMonth,
    super.notes,
    super.attachments,
    required super.status,
    super.currentStep,
    super.managerApproverId,
    super.hrApproverId,
    super.managerNotes,
    super.hrDecisionNotes,
    required super.createdAt,
    required super.updatedAt,
    super.user,
  });

  factory RaiseRequestModel.fromJson(Map<String, dynamic> json) {
    return RaiseRequestModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      type: _parseRaiseType(json['type'] as String),
      amount: double.parse(json['amount'].toString()),
      effectiveMonth: DateTime.parse(json['effectiveMonth'] as String),
      notes: json['notes'] as String?,
      attachments: json['attachments'] as List<dynamic>?,
      status: _parseRaiseStatus(json['status'] as String),
      currentStep: json['currentStep'] as String?,
      managerApproverId: json['managerApproverId'] as String?,
      hrApproverId: json['hrApproverId'] as String?,
      managerNotes: json['managerNotes'] as String?,
      hrDecisionNotes: json['hrDecisionNotes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      user: json['user'] != null
          ? RaiseRequestUserModel.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'type': _raiseTypeToString(type),
      'amount': amount,
      'effectiveMonth': effectiveMonth.toIso8601String(),
      'notes': notes,
      'attachments': attachments,
      'status': _raiseStatusToString(status),
    };
  }

  static RaiseType _parseRaiseType(String type) {
    switch (type) {
      case 'SALARY_INCREASE':
        return RaiseType.salaryIncrease;
      case 'ANNUAL_LEAVE_BONUS':
        return RaiseType.annualLeaveBonus;
      case 'BUSINESS_TRIP':
        return RaiseType.businessTrip;
      case 'BONUS':
        return RaiseType.bonus;
      case 'ALLOWANCE':
        return RaiseType.allowance;
      default:
        return RaiseType.other;
    }
  }

  static RaiseStatus _parseRaiseStatus(String status) {
    switch (status) {
      case 'PENDING':
        return RaiseStatus.pending;
      case 'MGR_APPROVED':
        return RaiseStatus.mgrApproved;
      case 'MGR_REJECTED':
        return RaiseStatus.mgrRejected;
      case 'APPROVED':
        return RaiseStatus.approved;
      case 'REJECTED':
        return RaiseStatus.rejected;
      case 'DELAYED':
        return RaiseStatus.delayed;
      case 'CANCELLED':
        return RaiseStatus.cancelled;
      default:
        return RaiseStatus.pending;
    }
  }

  static String _raiseTypeToString(RaiseType type) {
    switch (type) {
      case RaiseType.salaryIncrease:
        return 'SALARY_INCREASE';
      case RaiseType.annualLeaveBonus:
        return 'ANNUAL_LEAVE_BONUS';
      case RaiseType.businessTrip:
        return 'BUSINESS_TRIP';
      case RaiseType.bonus:
        return 'BONUS';
      case RaiseType.allowance:
        return 'ALLOWANCE';
      case RaiseType.other:
        return 'OTHER';
    }
  }

  static String _raiseStatusToString(RaiseStatus status) {
    switch (status) {
      case RaiseStatus.pending:
        return 'PENDING';
      case RaiseStatus.mgrApproved:
        return 'MGR_APPROVED';
      case RaiseStatus.mgrRejected:
        return 'MGR_REJECTED';
      case RaiseStatus.approved:
        return 'APPROVED';
      case RaiseStatus.rejected:
        return 'REJECTED';
      case RaiseStatus.delayed:
        return 'DELAYED';
      case RaiseStatus.cancelled:
        return 'CANCELLED';
    }
  }
}

class RaiseRequestUserModel extends RaiseRequestUser {
  const RaiseRequestUserModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    super.email,
    super.employeeCode,
    super.department,
    super.branch,
  });

  factory RaiseRequestUserModel.fromJson(Map<String, dynamic> json) {
    return RaiseRequestUserModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      email: json['email'] as String?,
      employeeCode: json['employeeCode'] as String?,
      department: json['department']?['name'] as String?,
      branch: json['branch']?['name'] as String?,
    );
  }
}

class CreateRaiseRequestDto {
  final RaiseType type;
  final double amount;
  final DateTime effectiveMonth;
  final String? notes;
  final List<dynamic>? attachments;
  final List<String>? attachmentPaths;

  CreateRaiseRequestDto({
    required this.type,
    required this.amount,
    required this.effectiveMonth,
    this.notes,
    this.attachments,
    this.attachmentPaths,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': RaiseRequestModel._raiseTypeToString(type),
      'amount': amount,
      'effectiveMonth': effectiveMonth.toIso8601String().split('T')[0],
      'notes': notes,
      if (attachments != null) 'attachments': attachments,
    };
  }
}

