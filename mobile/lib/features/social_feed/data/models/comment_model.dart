import 'post_model.dart';

/// نموذج التعليق
class Comment {
  final String id;
  final String postId;
  final PostAuthor author;
  final String content;
  final String? parentId;
  final List<Comment>? replies;
  final int repliesCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  Comment({
    required this.id,
    required this.postId,
    required this.author,
    required this.content,
    this.parentId,
    this.replies,
    required this.repliesCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] ?? '',
      postId: json['postId'] ?? '',
      author: PostAuthor.fromJson(json['author'] ?? {}),
      content: json['content'] ?? '',
      parentId: json['parentId'],
      replies: (json['replies'] as List<dynamic>?)
          ?.map((e) => Comment.fromJson(e))
          .toList(),
      repliesCount: json['repliesCount'] ?? json['_count']?['replies'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'postId': postId,
      'author': author.toJson(),
      'content': content,
      'parentId': parentId,
      'replies': replies?.map((e) => e.toJson()).toList(),
      'repliesCount': repliesCount,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
