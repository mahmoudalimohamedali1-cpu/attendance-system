import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/models/post_model.dart';

/// ويدجت عرض المنشور الواحد
class PostCard extends StatelessWidget {
  final Post post;
  final VoidCallback? onTap;
  final Function(String)? onReaction;

  const PostCard({
    super.key,
    required this.post,
    this.onTap,
    this.onReaction,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Author row
              _buildAuthorRow(),
              const SizedBox(height: 12),
              
              // Title if exists
              if (post.title != null && post.title!.isNotEmpty) ...[
                Text(
                  post.title!,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              
              // Content
              Text(
                post.content,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey[800],
                  height: 1.5,
                ),
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
              ),
              
              // Attachments preview if exists
              if (post.attachments != null && post.attachments!.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildAttachmentsPreview(),
              ],
              
              const SizedBox(height: 16),
              
              // Stats and reactions row
              _buildStatsRow(),
              
              const Divider(height: 24),
              
              // Reactions row
              _buildReactionsRow(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAuthorRow() {
    return Row(
      children: [
        CircleAvatar(
          radius: 22,
          backgroundColor: AppTheme.primaryColor,
          backgroundImage: post.author.avatar != null
              ? NetworkImage(post.author.avatar!)
              : null,
          child: post.author.avatar == null
              ? Text(
                  _getInitials(post.author.name),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      post.author.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (post.isPinned) ...[
                    const SizedBox(width: 6),
                    Icon(
                      Icons.push_pin,
                      size: 16,
                      color: Colors.orange[700],
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  if (post.author.jobTitle != null) ...[
                    Text(
                      post.author.jobTitle!,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                    const Text(' • ', style: TextStyle(color: Colors.grey)),
                  ],
                  Text(
                    _formatTimeAgo(post.createdAt),
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Post type badge
        if (post.type == 'ANNOUNCEMENT') ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.campaign, size: 14, color: Colors.blue[700]),
                const SizedBox(width: 4),
                Text(
                  'إعلان',
                  style: TextStyle(
                    color: Colors.blue[700],
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAttachmentsPreview() {
    final images = post.attachments!.where((a) => a.type == 'IMAGE').toList();
    
    if (images.isEmpty) return const SizedBox();
    
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 180,
        width: double.infinity,
        color: Colors.grey[200],
        child: images.length == 1
            ? Image.network(
                images.first.url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
              )
            : Row(
                children: images.take(2).map((img) {
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(2),
                      child: Image.network(
                        img.url,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
                      ),
                    ),
                  );
                }).toList(),
              ),
      ),
    );
  }

  Widget _buildStatsRow() {
    final totalReactions = post.reactions.fold<int>(
      0,
      (sum, r) => sum + r.count,
    );

    return Row(
      children: [
        if (totalReactions > 0) ...[
          _buildReactionBadges(),
          const SizedBox(width: 6),
          Text(
            totalReactions.toString(),
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
        ],
        const Spacer(),
        if (post.commentsCount > 0) ...[
          Text(
            '${post.commentsCount} تعليق',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
        ],
      ],
    );
  }

  Widget _buildReactionBadges() {
    final topReactions = post.reactions
        .where((r) => r.count > 0)
        .take(3)
        .toList();

    return Row(
      children: topReactions.map((r) {
        return Padding(
          padding: const EdgeInsets.only(left: 2),
          child: Text(
            _getReactionEmoji(r.type),
            style: const TextStyle(fontSize: 16),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildReactionsRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildActionButton(
          icon: post.userReaction != null
              ? _getReactionEmoji(post.userReaction!)
              : '👍',
          label: 'إعجاب',
          isActive: post.userReaction != null,
          onTap: () => onReaction?.call('LIKE'),
        ),
        _buildActionButton(
          icon: '💬',
          label: 'تعليق',
          onTap: onTap,
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required String icon,
    required String label,
    bool isActive = false,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppTheme.primaryColor : Colors.grey[600],
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              ),
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

  String _getReactionEmoji(String type) {
    switch (type.toUpperCase()) {
      case 'LIKE':
        return '👍';
      case 'LOVE':
        return '❤️';
      case 'CELEBRATE':
        return '🎉';
      case 'SUPPORT':
        return '💪';
      case 'INSIGHTFUL':
        return '💡';
      default:
        return '👍';
    }
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
