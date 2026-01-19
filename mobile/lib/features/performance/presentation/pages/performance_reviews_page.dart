import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';

class PerformanceReviewsPage extends ConsumerStatefulWidget {
  const PerformanceReviewsPage({super.key});

  @override
  ConsumerState<PerformanceReviewsPage> createState() => _PerformanceReviewsPageState();
}

class _PerformanceReviewsPageState extends ConsumerState<PerformanceReviewsPage> {
  List<dynamic> _reviews = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    setState(() => _loading = true);
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/performance-reviews/my-reviews');
      if (response.statusCode == 200) {
        setState(() {
          _reviews = response.data is List ? response.data : (response.data['data'] ?? []);
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تقييم الأداء'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReviews,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadReviews,
                        child: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                )
              : _reviews.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.star_border, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'لا توجد تقييمات',
                            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadReviews,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _reviews.length,
                        itemBuilder: (context, index) {
                          final review = _reviews[index];
                          return _ReviewCard(review: review);
                        },
                      ),
                    ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final dynamic review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final cycle = review['reviewCycle'] ?? {};
    final status = review['status'] ?? 'PENDING';
    final overallScore = review['overallScore'];
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    cycle['name'] ?? 'تقييم أداء',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                _buildStatusChip(status),
              ],
            ),
            const SizedBox(height: 8),
            if (cycle['year'] != null)
              Text(
                'السنة: ${cycle['year']}',
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              ),
            if (overallScore != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Text('التقييم: ', style: TextStyle(fontWeight: FontWeight.w500)),
                  _buildRatingStars(overallScore.toDouble()),
                  const SizedBox(width: 8),
                  Text(
                    '${overallScore.toStringAsFixed(1)}/5',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
            if (review['managerFeedback'] != null && review['managerFeedback'].toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'ملاحظات المدير:',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              Text(
                review['managerFeedback'],
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    String label;
    switch (status) {
      case 'COMPLETED':
        color = AppTheme.successColor;
        label = 'مكتمل';
        break;
      case 'IN_PROGRESS':
        color = Colors.blue;
        label = 'قيد التقييم';
        break;
      case 'SELF_REVIEW':
        color = Colors.orange;
        label = 'تقييم ذاتي';
        break;
      default:
        color = Colors.grey;
        label = 'معلق';
    }
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white)),
      backgroundColor: color,
      padding: EdgeInsets.zero,
    );
  }

  Widget _buildRatingStars(double score) {
    return Row(
      children: List.generate(5, (index) {
        if (index < score.floor()) {
          return const Icon(Icons.star, color: Colors.amber, size: 18);
        } else if (index < score) {
          return const Icon(Icons.star_half, color: Colors.amber, size: 18);
        } else {
          return const Icon(Icons.star_border, color: Colors.amber, size: 18);
        }
      }),
    );
  }
}
