import 'package:freezed_annotation/freezed_annotation.dart';

part 'custody_entity.freezed.dart';
part 'custody_entity.g.dart';

enum CustodyItemStatus {
  @JsonValue('AVAILABLE') available,
  @JsonValue('ASSIGNED') assigned,
  @JsonValue('IN_MAINTENANCE') inMaintenance,
  @JsonValue('LOST') lost,
  @JsonValue('DAMAGED') damaged,
  @JsonValue('DISPOSED') disposed,
  @JsonValue('RESERVED') reserved,
}

enum CustodyCondition {
  @JsonValue('NEW') newCondition,
  @JsonValue('EXCELLENT') excellent,
  @JsonValue('GOOD') good,
  @JsonValue('FAIR') fair,
  @JsonValue('POOR') poor,
}

@freezed
class CustodyCategory with _$CustodyCategory {
  const factory CustodyCategory({
    required String id,
    required String name,
    String? nameEn,
    String? description,
    String? icon,
    @Default(true) bool requiresApproval,
    @Default(true) bool requiresSerialNumber,
    int? depreciationYears,
    @Default(true) bool isActive,
  }) = _CustodyCategory;

  factory CustodyCategory.fromJson(Map<String, dynamic> json) =>
      _$CustodyCategoryFromJson(json);
}

@freezed
class CustodyItem with _$CustodyItem {
  const factory CustodyItem({
    required String id,
    required String code,
    required String name,
    String? nameEn,
    String? description,
    String? serialNumber,
    String? model,
    String? brand,
    String? barcode,
    String? qrCode,
    DateTime? purchaseDate,
    double? purchasePrice,
    DateTime? warrantyExpiry,
    String? vendor,
    String? invoiceNumber,
    @Default(CustodyItemStatus.available) CustodyItemStatus status,
    @Default(CustodyCondition.newCondition) CustodyCondition condition,
    String? currentLocation,
    String? notes,
    String? imageUrl,
    required String categoryId,
    CustodyCategory? category,
    String? branchId,
    String? currentAssigneeId,
    required DateTime createdAt,
  }) = _CustodyItem;

  factory CustodyItem.fromJson(Map<String, dynamic> json) =>
      _$CustodyItemFromJson(json);
}

@freezed
class CustodyAssignment with _$CustodyAssignment {
  const factory CustodyAssignment({
    required String id,
    required String custodyItemId,
    CustodyItem? custodyItem,
    required String employeeId,
    required DateTime assignedAt,
    DateTime? expectedReturn,
    DateTime? actualReturn,
    required String status,
    CustodyCondition? conditionOnAssign,
    CustodyCondition? conditionOnReturn,
    String? notes,
    String? employeeSignature,
    DateTime? signatureDate,
  }) = _CustodyAssignment;

  factory CustodyAssignment.fromJson(Map<String, dynamic> json) =>
      _$CustodyAssignmentFromJson(json);
}
