// lib/features/raises/domain/entities/raise_request.dart
import 'package:equatable/equatable.dart';

enum RaiseType {
  salaryIncrease,
  annualLeaveBonus,
  businessTrip,
  bonus,
  allowance,
  other,
}

enum RaiseStatus {
  pending,
  mgrApproved,
  mgrRejected,
  approved,
  rejected,
  delayed,
  cancelled,
}

class RaiseRequest extends Equatable {
  final String id;
  final String userId;
  final RaiseType type;
  final double amount;
  final DateTime effectiveMonth;
  final String? notes;
  final List<dynamic>? attachments;
  final RaiseStatus status;
  final String? currentStep;
  final String? managerApproverId;
  final String? hrApproverId;
  final String? managerNotes;
  final String? hrDecisionNotes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final RaiseRequestUser? user;

  const RaiseRequest({
    required this.id,
    required this.userId,
    required this.type,
    required this.amount,
    required this.effectiveMonth,
    this.notes,
    this.attachments,
    required this.status,
    this.currentStep,
    this.managerApproverId,
    this.hrApproverId,
    this.managerNotes,
    this.hrDecisionNotes,
    required this.createdAt,
    required this.updatedAt,
    this.user,
  });

  @override
  List<Object?> get props => [id, userId, type, amount, effectiveMonth, status];
}

class RaiseRequestUser extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? employeeCode;
  final String? department;
  final String? branch;

  const RaiseRequestUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.employeeCode,
    this.department,
    this.branch,
  });

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [id, firstName, lastName, email];
}
