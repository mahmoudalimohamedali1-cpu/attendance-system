// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'custody_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CustodyCategoryImpl _$$CustodyCategoryImplFromJson(
        Map<String, dynamic> json) =>
    _$CustodyCategoryImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      nameEn: json['nameEn'] as String?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      requiresApproval: json['requiresApproval'] as bool? ?? true,
      requiresSerialNumber: json['requiresSerialNumber'] as bool? ?? true,
      depreciationYears: (json['depreciationYears'] as num?)?.toInt(),
      isActive: json['isActive'] as bool? ?? true,
    );

Map<String, dynamic> _$$CustodyCategoryImplToJson(
        _$CustodyCategoryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'nameEn': instance.nameEn,
      'description': instance.description,
      'icon': instance.icon,
      'requiresApproval': instance.requiresApproval,
      'requiresSerialNumber': instance.requiresSerialNumber,
      'depreciationYears': instance.depreciationYears,
      'isActive': instance.isActive,
    };

_$CustodyItemImpl _$$CustodyItemImplFromJson(Map<String, dynamic> json) =>
    _$CustodyItemImpl(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      nameEn: json['nameEn'] as String?,
      description: json['description'] as String?,
      serialNumber: json['serialNumber'] as String?,
      model: json['model'] as String?,
      brand: json['brand'] as String?,
      barcode: json['barcode'] as String?,
      qrCode: json['qrCode'] as String?,
      purchaseDate: json['purchaseDate'] == null
          ? null
          : DateTime.parse(json['purchaseDate'] as String),
      purchasePrice: (json['purchasePrice'] as num?)?.toDouble(),
      warrantyExpiry: json['warrantyExpiry'] == null
          ? null
          : DateTime.parse(json['warrantyExpiry'] as String),
      vendor: json['vendor'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      status: $enumDecodeNullable(_$CustodyItemStatusEnumMap, json['status']) ??
          CustodyItemStatus.available,
      condition:
          $enumDecodeNullable(_$CustodyConditionEnumMap, json['condition']) ??
              CustodyCondition.newCondition,
      currentLocation: json['currentLocation'] as String?,
      notes: json['notes'] as String?,
      imageUrl: json['imageUrl'] as String?,
      categoryId: json['categoryId'] as String,
      category: json['category'] == null
          ? null
          : CustodyCategory.fromJson(json['category'] as Map<String, dynamic>),
      branchId: json['branchId'] as String?,
      currentAssigneeId: json['currentAssigneeId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$$CustodyItemImplToJson(_$CustodyItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'name': instance.name,
      'nameEn': instance.nameEn,
      'description': instance.description,
      'serialNumber': instance.serialNumber,
      'model': instance.model,
      'brand': instance.brand,
      'barcode': instance.barcode,
      'qrCode': instance.qrCode,
      'purchaseDate': instance.purchaseDate?.toIso8601String(),
      'purchasePrice': instance.purchasePrice,
      'warrantyExpiry': instance.warrantyExpiry?.toIso8601String(),
      'vendor': instance.vendor,
      'invoiceNumber': instance.invoiceNumber,
      'status': _$CustodyItemStatusEnumMap[instance.status]!,
      'condition': _$CustodyConditionEnumMap[instance.condition]!,
      'currentLocation': instance.currentLocation,
      'notes': instance.notes,
      'imageUrl': instance.imageUrl,
      'categoryId': instance.categoryId,
      'category': instance.category,
      'branchId': instance.branchId,
      'currentAssigneeId': instance.currentAssigneeId,
      'createdAt': instance.createdAt.toIso8601String(),
    };

const _$CustodyItemStatusEnumMap = {
  CustodyItemStatus.available: 'AVAILABLE',
  CustodyItemStatus.assigned: 'ASSIGNED',
  CustodyItemStatus.inMaintenance: 'IN_MAINTENANCE',
  CustodyItemStatus.lost: 'LOST',
  CustodyItemStatus.damaged: 'DAMAGED',
  CustodyItemStatus.disposed: 'DISPOSED',
  CustodyItemStatus.reserved: 'RESERVED',
};

const _$CustodyConditionEnumMap = {
  CustodyCondition.newCondition: 'NEW',
  CustodyCondition.excellent: 'EXCELLENT',
  CustodyCondition.good: 'GOOD',
  CustodyCondition.fair: 'FAIR',
  CustodyCondition.poor: 'POOR',
};

_$CustodyAssignmentImpl _$$CustodyAssignmentImplFromJson(
        Map<String, dynamic> json) =>
    _$CustodyAssignmentImpl(
      id: json['id'] as String,
      custodyItemId: json['custodyItemId'] as String,
      custodyItem: json['custodyItem'] == null
          ? null
          : CustodyItem.fromJson(json['custodyItem'] as Map<String, dynamic>),
      employeeId: json['employeeId'] as String,
      assignedAt: DateTime.parse(json['assignedAt'] as String),
      expectedReturn: json['expectedReturn'] == null
          ? null
          : DateTime.parse(json['expectedReturn'] as String),
      actualReturn: json['actualReturn'] == null
          ? null
          : DateTime.parse(json['actualReturn'] as String),
      status: json['status'] as String,
      conditionOnAssign: $enumDecodeNullable(
          _$CustodyConditionEnumMap, json['conditionOnAssign']),
      conditionOnReturn: $enumDecodeNullable(
          _$CustodyConditionEnumMap, json['conditionOnReturn']),
      notes: json['notes'] as String?,
      employeeSignature: json['employeeSignature'] as String?,
      signatureDate: json['signatureDate'] == null
          ? null
          : DateTime.parse(json['signatureDate'] as String),
    );

Map<String, dynamic> _$$CustodyAssignmentImplToJson(
        _$CustodyAssignmentImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'custodyItemId': instance.custodyItemId,
      'custodyItem': instance.custodyItem,
      'employeeId': instance.employeeId,
      'assignedAt': instance.assignedAt.toIso8601String(),
      'expectedReturn': instance.expectedReturn?.toIso8601String(),
      'actualReturn': instance.actualReturn?.toIso8601String(),
      'status': instance.status,
      'conditionOnAssign':
          _$CustodyConditionEnumMap[instance.conditionOnAssign],
      'conditionOnReturn':
          _$CustodyConditionEnumMap[instance.conditionOnReturn],
      'notes': instance.notes,
      'employeeSignature': instance.employeeSignature,
      'signatureDate': instance.signatureDate?.toIso8601String(),
    };
