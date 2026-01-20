/// نموذج المنشور
class Post {
  final String id;
  final String companyId;
  final String type;
  final String status;
  final String? title;
  final String content;
  final PostAuthor author;
  final String visibilityType;
  final bool isPinned;
  final String? pinnedUntil;
  final String? publishedAt;
  final bool requireAcknowledge;
  final bool hideAfterAcknowledge;
  final bool allowComments;
  final bool? acknowledged;
  final String? acknowledgedAt;
  final List<ReactionSummary> reactions;
  final String? userReaction;
  final int commentsCount;
  final int viewsCount;
  final int impressionCount;
  final List<PostAttachment>? attachments;
  final DateTime createdAt;
  final DateTime updatedAt;

  Post({
    required this.id,
    required this.companyId,
    required this.type,
    required this.status,
    this.title,
    required this.content,
    required this.author,
    required this.visibilityType,
    required this.isPinned,
    this.pinnedUntil,
    this.publishedAt,
    required this.requireAcknowledge,
    required this.hideAfterAcknowledge,
    required this.allowComments,
    this.acknowledged,
    this.acknowledgedAt,
    required this.reactions,
    this.userReaction,
    required this.commentsCount,
    required this.viewsCount,
    required this.impressionCount,
    this.attachments,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'] ?? '',
      companyId: json['companyId'] ?? '',
      type: json['type'] ?? 'POST',
      status: json['status'] ?? 'PUBLISHED',
      title: json['title'],
      content: json['content'] ?? '',
      author: PostAuthor.fromJson(json['author'] ?? {}),
      visibilityType: json['visibilityType'] ?? 'PUBLIC',
      isPinned: json['isPinned'] ?? false,
      pinnedUntil: json['pinnedUntil'],
      publishedAt: json['publishedAt'],
      requireAcknowledge: json['requireAcknowledge'] ?? false,
      hideAfterAcknowledge: json['hideAfterAcknowledge'] ?? false,
      allowComments: json['allowComments'] ?? true,
      acknowledged: json['acknowledged'],
      acknowledgedAt: json['acknowledgedAt'],
      reactions: (json['reactions'] as List<dynamic>?)
              ?.map((e) => ReactionSummary.fromJson(e))
              .toList() ??
          [],
      userReaction: json['userReaction'],
      commentsCount: json['commentsCount'] ?? 0,
      viewsCount: json['viewsCount'] ?? 0,
      impressionCount: json['impressionCount'] ?? 0,
      attachments: (json['attachments'] as List<dynamic>?)
          ?.map((e) => PostAttachment.fromJson(e))
          .toList(),
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'companyId': companyId,
      'type': type,
      'status': status,
      'title': title,
      'content': content,
      'author': author.toJson(),
      'visibilityType': visibilityType,
      'isPinned': isPinned,
      'pinnedUntil': pinnedUntil,
      'publishedAt': publishedAt,
      'requireAcknowledge': requireAcknowledge,
      'hideAfterAcknowledge': hideAfterAcknowledge,
      'allowComments': allowComments,
      'acknowledged': acknowledged,
      'acknowledgedAt': acknowledgedAt,
      'reactions': reactions.map((e) => e.toJson()).toList(),
      'userReaction': userReaction,
      'commentsCount': commentsCount,
      'viewsCount': viewsCount,
      'impressionCount': impressionCount,
      'attachments': attachments?.map((e) => e.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

/// نموذج صاحب المنشور
class PostAuthor {
  final String id;
  final String name;
  final String? avatar;
  final String? jobTitle;
  final String? department;

  PostAuthor({
    required this.id,
    required this.name,
    this.avatar,
    this.jobTitle,
    this.department,
  });

  factory PostAuthor.fromJson(Map<String, dynamic> json) {
    // Handle both firstName/lastName and name formats
    String name = json['name'] ?? '';
    if (name.isEmpty) {
      final firstName = json['firstName'] ?? '';
      final lastName = json['lastName'] ?? '';
      name = '$firstName $lastName'.trim();
      if (name.isEmpty) name = 'مستخدم';
    }
    
    return PostAuthor(
      id: json['id'] ?? '',
      name: name,
      avatar: json['avatar'],
      jobTitle: json['jobTitle'],
      department: json['department'] is Map
          ? json['department']['name']
          : json['department'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'avatar': avatar,
      'jobTitle': jobTitle,
      'department': department,
    };
  }
}

/// نموذج ملخص التفاعلات
class ReactionSummary {
  final String type;
  final int count;
  final bool hasReacted;

  ReactionSummary({
    required this.type,
    required this.count,
    required this.hasReacted,
  });

  factory ReactionSummary.fromJson(Map<String, dynamic> json) {
    return ReactionSummary(
      type: json['type'] ?? '',
      count: json['count'] ?? 0,
      hasReacted: json['hasReacted'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'count': count,
      'hasReacted': hasReacted,
    };
  }
}

/// نموذج المرفقات
class PostAttachment {
  final String id;
  final String type;
  final String url;
  final String? thumbnailUrl;
  final String? name;
  final int? size;

  PostAttachment({
    required this.id,
    required this.type,
    required this.url,
    this.thumbnailUrl,
    this.name,
    this.size,
  });

  factory PostAttachment.fromJson(Map<String, dynamic> json) {
    return PostAttachment(
      id: json['id'] ?? '',
      type: json['type'] ?? 'DOCUMENT',
      url: json['url'] ?? '',
      thumbnailUrl: json['thumbnailUrl'],
      name: json['name'],
      size: json['size'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'url': url,
      'thumbnailUrl': thumbnailUrl,
      'name': name,
      'size': size,
    };
  }
}
