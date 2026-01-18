import 'package:dio/dio.dart';

class CustodyRemoteDataSource {
  final Dio _dio;

  CustodyRemoteDataSource(this._dio);

  // ==================== My Custody ====================
  Future<List<CustodyAssignmentModel>> getMyCustody() async {
    final response = await _dio.get('/custody/my-custody');
    return (response.data as List)
        .map((e) => CustodyAssignmentModel.fromJson(e))
        .toList();
  }

  // ==================== Categories ====================
  Future<List<CustodyCategoryModel>> getCategories() async {
    final response = await _dio.get('/custody/categories');
    return (response.data as List)
        .map((e) => CustodyCategoryModel.fromJson(e))
        .toList();
  }

  // ==================== Return Request ====================
  Future<void> requestReturn({
    required String assignmentId,
    required String conditionOnReturn,
    String? returnReason,
    String? damageDescription,
  }) async {
    await _dio.post('/custody/return/request', data: {
      'assignmentId': assignmentId,
      'conditionOnReturn': conditionOnReturn,
      if (returnReason != null) 'returnReason': returnReason,
      if (damageDescription != null) 'damageDescription': damageDescription,
    });
  }

  // ==================== Transfer Request ====================
  Future<void> requestTransfer({
    required String custodyItemId,
    required String toEmployeeId,
    String? reason,
    String? notes,
  }) async {
    await _dio.post('/custody/transfer/request', data: {
      'custodyItemId': custodyItemId,
      'toEmployeeId': toEmployeeId,
      if (reason != null) 'reason': reason,
      if (notes != null) 'notes': notes,
    });
  }

  // ==================== My Pending Transfers ====================
  Future<List<CustodyTransferModel>> getMyPendingTransfers() async {
    final response = await _dio.get('/custody/transfers/pending');
    return (response.data as List)
        .map((e) => CustodyTransferModel.fromJson(e))
        .toList();
  }

  // ==================== Accept/Reject Transfer ====================
  Future<void> approveTransfer(String transferId, {String? signature}) async {
    await _dio.post('/custody/transfer/approve', data: {
      'transferId': transferId,
      if (signature != null) 'signature': signature,
    });
  }

  Future<void> rejectTransfer(String transferId, String reason) async {
    await _dio.post('/custody/transfer/reject', data: {
      'transferId': transferId,
      'reason': reason,
    });
  }

  // ==================== Sign Assignment ====================
  Future<void> signAssignment(String assignmentId, String signature) async {
    await _dio.post('/custody/assignments/sign', data: {
      'assignmentId': assignmentId,
      'signature': signature,
    });
  }

  // ==================== My Report ====================
  Future<CustodyReportModel> getMyReport() async {
    final response = await _dio.get('/custody/reports/my');
    return CustodyReportModel.fromJson(response.data);
  }
}

// ==================== Models ====================
class CustodyCategoryModel {
  final String id;
  final String name;
  final String? nameEn;
  final String? icon;

  CustodyCategoryModel({
    required this.id,
    required this.name,
    this.nameEn,
    this.icon,
  });

  factory CustodyCategoryModel.fromJson(Map<String, dynamic> json) {
    return CustodyCategoryModel(
      id: json['id'],
      name: json['name'],
      nameEn: json['nameEn'],
      icon: json['icon'],
    );
  }
}

class CustodyItemModel {
  final String id;
  final String code;
  final String name;
  final String? serialNumber;
  final String? model;
  final String? brand;
  final String? qrCode;
  final String status;
  final String condition;
  final CustodyCategoryModel? category;

  CustodyItemModel({
    required this.id,
    required this.code,
    required this.name,
    this.serialNumber,
    this.model,
    this.brand,
    this.qrCode,
    required this.status,
    required this.condition,
    this.category,
  });

  factory CustodyItemModel.fromJson(Map<String, dynamic> json) {
    return CustodyItemModel(
      id: json['id'],
      code: json['code'],
      name: json['name'],
      serialNumber: json['serialNumber'],
      model: json['model'],
      brand: json['brand'],
      qrCode: json['qrCode'],
      status: json['status'],
      condition: json['condition'],
      category: json['category'] != null
          ? CustodyCategoryModel.fromJson(json['category'])
          : null,
    );
  }
}

class CustodyAssignmentModel {
  final String id;
  final String custodyItemId;
  final CustodyItemModel? custodyItem;
  final DateTime assignedAt;
  final DateTime? expectedReturn;
  final String status;
  final String? conditionOnAssign;
  final String? notes;
  final String? employeeSignature;

  CustodyAssignmentModel({
    required this.id,
    required this.custodyItemId,
    this.custodyItem,
    required this.assignedAt,
    this.expectedReturn,
    required this.status,
    this.conditionOnAssign,
    this.notes,
    this.employeeSignature,
  });

  factory CustodyAssignmentModel.fromJson(Map<String, dynamic> json) {
    return CustodyAssignmentModel(
      id: json['id'],
      custodyItemId: json['custodyItemId'],
      custodyItem: json['custodyItem'] != null
          ? CustodyItemModel.fromJson(json['custodyItem'])
          : null,
      assignedAt: DateTime.parse(json['assignedAt']),
      expectedReturn: json['expectedReturn'] != null
          ? DateTime.parse(json['expectedReturn'])
          : null,
      status: json['status'],
      conditionOnAssign: json['conditionOnAssign'],
      notes: json['notes'],
      employeeSignature: json['employeeSignature'],
    );
  }
}

class CustodyTransferModel {
  final String id;
  final String custodyItemId;
  final CustodyItemModel? custodyItem;
  final String fromEmployeeId;
  final String toEmployeeId;
  final DateTime transferDate;
  final String? reason;
  final String status;

  CustodyTransferModel({
    required this.id,
    required this.custodyItemId,
    this.custodyItem,
    required this.fromEmployeeId,
    required this.toEmployeeId,
    required this.transferDate,
    this.reason,
    required this.status,
  });

  factory CustodyTransferModel.fromJson(Map<String, dynamic> json) {
    return CustodyTransferModel(
      id: json['id'],
      custodyItemId: json['custodyItemId'],
      custodyItem: json['custodyItem'] != null
          ? CustodyItemModel.fromJson(json['custodyItem'])
          : null,
      fromEmployeeId: json['fromEmployeeId'],
      toEmployeeId: json['toEmployeeId'],
      transferDate: DateTime.parse(json['transferDate']),
      reason: json['reason'],
      status: json['status'],
    );
  }
}

class CustodyReportModel {
  final List<CustodyAssignmentModel> current;
  final List<CustodyAssignmentModel> history;
  final double totalValue;

  CustodyReportModel({
    required this.current,
    required this.history,
    required this.totalValue,
  });

  factory CustodyReportModel.fromJson(Map<String, dynamic> json) {
    return CustodyReportModel(
      current: (json['current'] as List)
          .map((e) => CustodyAssignmentModel.fromJson(e))
          .toList(),
      history: (json['history'] as List)
          .map((e) => CustodyAssignmentModel.fromJson(e))
          .toList(),
      totalValue: (json['totalValue'] as num).toDouble(),
    );
  }
}
