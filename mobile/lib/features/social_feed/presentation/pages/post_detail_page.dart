import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/models/post_model.dart';
import '../../data/models/comment_model.dart';
import '../widgets/post_card.dart';

/// صفحة تفاصيل المنشور مع التعليقات
class PostDetailPage extends StatefulWidget {
  final Post post;

  const PostDetailPage({super.key, required this.post});

  @override
  State<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends State<PostDetailPage> {
  final ApiClient _apiClient = GetIt.I<ApiClient>();
  final TextEditingController _commentController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<Comment> _comments = [];
  bool _isLoadingComments = true;
  bool _isSubmitting = false;
  String? _replyingTo;
  String? _replyingToAuthor;

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() {
      _isLoadingComments = true;
    });

    try {
      final response = await _apiClient.getComments(widget.post.id, {
        'page': 1,
        'limit': 50,
      });

      if (response.data != null) {
        final List<dynamic> items = response.data['items'] ?? [];
        setState(() {
          _comments = items.map((e) => Comment.fromJson(e)).toList();
          _isLoadingComments = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingComments = false;
      });
      debugPrint('❌ Error loading comments: $e');
    }
  }

  Future<void> _submitComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _apiClient.addComment(widget.post.id, {
        'content': content,
        if (_replyingTo != null) 'parentId': _replyingTo,
      });

      _commentController.clear();
      setState(() {
        _replyingTo = null;
        _replyingToAuthor = null;
      });
      _loadComments();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إضافة التعليق')),
        );
      }
    } catch (e) {
      debugPrint('❌ Error adding comment: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('حدث خطأ')),
        );
      }
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  void _cancelReply() {
    setState(() {
      _replyingTo = null;
      _replyingToAuthor = null;
    });
  }

  void _replyTo(Comment comment) {
    setState(() {
      _replyingTo = comment.id;
      _replyingToAuthor = comment.author.name;
    });
    _commentController.selection = TextSelection.fromPosition(
      TextPosition(offset: _commentController.text.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('المنشور'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollController,
              child: Column(
                children: [
                  // Post content (without tap action)
                  PostCard(post: widget.post),
                  
                  const Divider(height: 1),
                  
                  // Comments section
                  _buildCommentsSection(),
                ],
              ),
            ),
          ),
          
          // Comment input
          _buildCommentInput(),
        ],
      ),
    );
  }

  Widget _buildCommentsSection() {
    if (_isLoadingComments) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_comments.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 48,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 12),
            Text(
              'لا توجد تعليقات',
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'كن أول من يعلق!',
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'التعليقات (${_comments.length})',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          ..._comments.map((comment) => _buildCommentItem(comment)).toList(),
        ],
      ),
    );
  }

  Widget _buildCommentItem(Comment comment, {bool isReply = false}) {
    return Container(
      margin: EdgeInsets.only(
        bottom: 12,
        right: isReply ? 32 : 0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: isReply ? 16 : 18,
            backgroundColor: AppTheme.primaryColor.withOpacity(0.7),
            backgroundImage: comment.author.avatar != null
                ? NetworkImage(comment.author.avatar!)
                : null,
            child: comment.author.avatar == null
                ? Text(
                    _getInitials(comment.author.name),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: isReply ? 10 : 12,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        comment.author.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        comment.content,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      _formatTimeAgo(comment.createdAt),
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontSize: 12,
                      ),
                    ),
                    if (!isReply) ...[
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: () => _replyTo(comment),
                        child: Text(
                          'رد',
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                
                // Replies
                if (comment.replies != null && comment.replies!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...comment.replies!.map((reply) => 
                    _buildCommentItem(reply, isReply: true)).toList(),
                ],
                
                // Load replies button
                if (comment.repliesCount > 0 && 
                    (comment.replies == null || comment.replies!.isEmpty)) ...[
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _loadReplies(comment),
                    child: Text(
                      'عرض ${comment.repliesCount} ردود',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _loadReplies(Comment comment) async {
    try {
      final response = await _apiClient.getComments(widget.post.id, {
        'parentId': comment.id,
        'limit': 20,
      });

      if (response.data != null) {
        final List<dynamic> items = response.data['items'] ?? [];
        final replies = items.map((e) => Comment.fromJson(e)).toList();
        
        setState(() {
          final index = _comments.indexWhere((c) => c.id == comment.id);
          if (index >= 0) {
            _comments[index] = Comment(
              id: comment.id,
              postId: comment.postId,
              author: comment.author,
              content: comment.content,
              parentId: comment.parentId,
              replies: replies,
              repliesCount: comment.repliesCount,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
            );
          }
        });
      }
    } catch (e) {
      debugPrint('❌ Error loading replies: $e');
    }
  }

  Widget _buildCommentInput() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Reply indicator
            if (_replyingToAuthor != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.reply, size: 16, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text(
                      'الرد على $_replyingToAuthor',
                      style: const TextStyle(color: Colors.blue, fontSize: 13),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: _cancelReply,
                      child: const Icon(Icons.close, size: 18, color: Colors.blue),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
            
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: _replyingToAuthor != null
                          ? 'اكتب ردك...'
                          : 'اكتب تعليقك...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                    maxLines: 3,
                    minLines: 1,
                    textInputAction: TextInputAction.newline,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    onPressed: _isSubmitting ? null : _submitComment,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send, color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    if (name.isEmpty) return '??';
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  String _formatTimeAgo(DateTime dateTime) {
    final difference = DateTime.now().difference(dateTime);
    
    if (difference.inDays > 7) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } else if (difference.inDays > 0) {
      return 'منذ ${difference.inDays} يوم';
    } else if (difference.inHours > 0) {
      return 'منذ ${difference.inHours} ساعة';
    } else if (difference.inMinutes > 0) {
      return 'منذ ${difference.inMinutes} دقيقة';
    } else {
      return 'الآن';
    }
  }
}
