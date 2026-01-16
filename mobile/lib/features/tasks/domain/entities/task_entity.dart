/// Task entity for mobile app
class TaskEntity {
  final String id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? assigneeId;
  final String? assigneeName;
  final String? createdById;
  final String? createdByName;
  final List<String> tags;
  final int progress;
  final String? categoryId;
  final String? categoryName;

  TaskEntity({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    required this.createdAt,
    this.updatedAt,
    this.assigneeId,
    this.assigneeName,
    this.createdById,
    this.createdByName,
    this.tags = const [],
    this.progress = 0,
    this.categoryId,
    this.categoryName,
  });

  factory TaskEntity.fromJson(Map<String, dynamic> json) {
    return TaskEntity(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      status: json['status'] ?? 'TODO',
      priority: json['priority'] ?? 'MEDIUM',
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : null,
      assigneeId: json['assigneeId'],
      assigneeName: json['assignee']?['name'],
      createdById: json['createdById'],
      createdByName: json['createdBy']?['name'],
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      progress: json['progress'] ?? 0,
      categoryId: json['categoryId'],
      categoryName: json['category']?['name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'dueDate': dueDate?.toIso8601String(),
      'progress': progress,
    };
  }

  /// Get status display label in Arabic
  String get statusLabel {
    switch (status) {
      case 'BACKLOG':
        return 'قائمة الانتظار';
      case 'TODO':
        return 'للعمل';
      case 'IN_PROGRESS':
        return 'جاري العمل';
      case 'IN_REVIEW':
        return 'قيد المراجعة';
      case 'BLOCKED':
        return 'محظور';
      case 'COMPLETED':
        return 'مكتمل';
      default:
        return status;
    }
  }

  /// Get priority display label in Arabic
  String get priorityLabel {
    switch (priority) {
      case 'URGENT':
        return 'عاجل';
      case 'HIGH':
        return 'عالي';
      case 'MEDIUM':
        return 'متوسط';
      case 'LOW':
        return 'منخفض';
      default:
        return priority;
    }
  }

  /// Get priority icon
  String get priorityIcon {
    switch (priority) {
      case 'URGENT':
        return '🔥';
      case 'HIGH':
        return '⚡';
      case 'MEDIUM':
        return '📌';
      case 'LOW':
        return '💤';
      default:
        return '📌';
    }
  }
}
