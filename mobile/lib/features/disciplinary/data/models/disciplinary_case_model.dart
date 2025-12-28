/// نموذج قضية الجزاء
class DisciplinaryCase {
  final String id;
  final String accusedId;
  final String? accusedName;
  final String? accusedEmployeeCode;
  final String reporterId;
  final String? reporterName;
  final String description;
  final String status;
  final String? violationType;
  final DateTime? incidentDate;
  final String? hrReviewNotes;
  final String? hearingNotes;
  final String? decisionType;
  final String? decisionNotes;
  final double? penaltyAmount;
  final String? penaltyCycle;
  final bool? legalHold;
  final String? employeeInformalResponse;
  final String? employeeDecisionResponse;
  final bool? employeeObjected;
  final String? objectionNotes;
  final DateTime? finalizedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<DisciplinaryEvent>? events;
  final List<DisciplinaryAttachment>? attachments;

  DisciplinaryCase({
    required this.id,
    required this.accusedId,
    this.accusedName,
    this.accusedEmployeeCode,
    required this.reporterId,
    this.reporterName,
    required this.description,
    required this.status,
    this.violationType,
    this.incidentDate,
    this.hrReviewNotes,
    this.hearingNotes,
    this.decisionType,
    this.decisionNotes,
    this.penaltyAmount,
    this.penaltyCycle,
    this.legalHold,
    this.employeeInformalResponse,
    this.employeeDecisionResponse,
    this.employeeObjected,
    this.objectionNotes,
    this.finalizedAt,
    required this.createdAt,
    required this.updatedAt,
    this.events,
    this.attachments,
  });

  factory DisciplinaryCase.fromJson(Map<String, dynamic> json) {
    return DisciplinaryCase(
      id: json['id'] ?? '',
      accusedId: json['employeeId'] ?? json['accusedId'] ?? '',
      accusedName: json['employee']?['firstName'] != null
          ? '${json['employee']['firstName']} ${json['employee']['lastName'] ?? ''}'
          : (json['accused']?['firstName'] != null
              ? '${json['accused']['firstName']} ${json['accused']['lastName'] ?? ''}'
              : null),
      accusedEmployeeCode: json['employee']?['employeeCode'] ?? json['accused']?['employeeCode'],
      reporterId: json['managerId'] ?? json['reporterId'] ?? '',
      reporterName: json['manager']?['firstName'] != null
          ? '${json['manager']['firstName']} ${json['manager']['lastName'] ?? ''}'
          : (json['reporter']?['firstName'] != null
              ? '${json['reporter']['firstName']} ${json['reporter']['lastName'] ?? ''}'
              : null),
      description: json['description'] ?? '',
      status: json['status'] ?? '',
      violationType: json['violationType'],
      incidentDate: json['incidentDate'] != null
          ? DateTime.parse(json['incidentDate'])
          : null,
      hrReviewNotes: json['hrReviewNotes'],
      hearingNotes: json['hearingNotes'],
      decisionType: json['decisionType'],
      decisionNotes: json['decisionNotes'],
      penaltyAmount: json['penaltyAmount']?.toDouble(),
      penaltyCycle: json['penaltyCycle'],
      legalHold: json['legalHold'],
      employeeInformalResponse: json['employeeInformalResponse'],
      employeeDecisionResponse: json['employeeDecisionResponse'],
      employeeObjected: json['employeeObjected'],
      objectionNotes: json['objectionNotes'],
      finalizedAt: json['finalizedAt'] != null
          ? DateTime.parse(json['finalizedAt'])
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      events: json['events'] != null
          ? (json['events'] as List)
              .map((e) => DisciplinaryEvent.fromJson(e))
              .toList()
          : null,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List)
              .map((e) => DisciplinaryAttachment.fromJson(e))
              .toList()
          : null,
    );
  }

  /// اسم الحالة بالعربي
  String get statusArabic {
    switch (status) {
      case 'CASE_SUBMITTED':
        return 'تم التقديم';
      case 'UNDER_HR_REVIEW':
        return 'قيد المراجعة';
      case 'HR_REJECTED':
        return 'مرفوض من HR';
      case 'INFORMAL_SENT':
        return 'أرسل غير رسمي';
      case 'EMP_ACCEPTED_INFORMAL':
        return 'قبل الموظف';
      case 'EMP_REJECTED_INFORMAL':
        return 'رفض الموظف';
      case 'HEARING_SCHEDULED':
        return 'جلسة محددة';
      case 'DECISION_ISSUED':
        return 'صدر القرار';
      case 'EMP_ACCEPTED_DECISION':
        return 'قبل القرار';
      case 'EMP_OBJECTED':
        return 'اعترض';
      case 'FINALIZED':
        return 'مُعتمد نهائي';
      default:
        return status;
    }
  }

  /// لون الحالة
  int get statusColor {
    switch (status) {
      case 'CASE_SUBMITTED':
      case 'UNDER_HR_REVIEW':
        return 0xFFFFA726; // Orange
      case 'HR_REJECTED':
        return 0xFFE53935; // Red
      case 'INFORMAL_SENT':
      case 'HEARING_SCHEDULED':
        return 0xFF42A5F5; // Blue
      case 'EMP_ACCEPTED_INFORMAL':
      case 'EMP_ACCEPTED_DECISION':
        return 0xFF66BB6A; // Green
      case 'EMP_REJECTED_INFORMAL':
      case 'EMP_OBJECTED':
        return 0xFFEF5350; // Light Red
      case 'DECISION_ISSUED':
        return 0xFF7E57C2; // Purple
      case 'FINALIZED':
        return 0xFF26A69A; // Teal
      default:
        return 0xFF9E9E9E; // Grey
    }
  }
}

/// حدث في قضية الجزاء
class DisciplinaryEvent {
  final String id;
  final String action;
  final String? notes;
  final String? actorId;
  final String? actorName;
  final DateTime createdAt;

  DisciplinaryEvent({
    required this.id,
    required this.action,
    this.notes,
    this.actorId,
    this.actorName,
    required this.createdAt,
  });

  factory DisciplinaryEvent.fromJson(Map<String, dynamic> json) {
    return DisciplinaryEvent(
      id: json['id'] ?? '',
      action: json['action'] ?? '',
      notes: json['notes'],
      actorId: json['actorId'],
      actorName: json['actor']?['firstName'] != null
          ? '${json['actor']['firstName']} ${json['actor']['lastName'] ?? ''}'
          : null,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  String get actionArabic {
    switch (action) {
      case 'CASE_CREATED':
        return 'تم إنشاء القضية';
      case 'HR_REVIEWED':
        return 'تمت المراجعة من HR';
      case 'HR_REJECTED':
        return 'رفض HR';
      case 'INFORMAL_SENT':
        return 'أرسل طلب غير رسمي';
      case 'EMP_RESPONDED_INFORMAL':
        return 'رد الموظف';
      case 'HEARING_SCHEDULED':
        return 'تم تحديد جلسة';
      case 'MINUTES_ADDED':
        return 'تم إضافة محضر';
      case 'DECISION_ISSUED':
        return 'صدر القرار';
      case 'EMP_RESPONDED_DECISION':
        return 'رد الموظف على القرار';
      case 'OBJECTION_REVIEWED':
        return 'تمت مراجعة الاعتراض';
      case 'FINALIZED':
        return 'تم الاعتماد النهائي';
      default:
        return action;
    }
  }
}

/// مرفق قضية
class DisciplinaryAttachment {
  final String id;
  final String fileName;
  final String? fileUrl;
  final String? category;
  final DateTime createdAt;

  DisciplinaryAttachment({
    required this.id,
    required this.fileName,
    this.fileUrl,
    this.category,
    required this.createdAt,
  });

  factory DisciplinaryAttachment.fromJson(Map<String, dynamic> json) {
    return DisciplinaryAttachment(
      id: json['id'] ?? '',
      fileName: json['fileName'] ?? '',
      fileUrl: json['fileUrl'],
      category: json['category'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
