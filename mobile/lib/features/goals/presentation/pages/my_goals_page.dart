import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';

class MyGoalsPage extends ConsumerStatefulWidget {
  const MyGoalsPage({super.key});

  @override
  ConsumerState<MyGoalsPage> createState() => _MyGoalsPageState();
}

class _MyGoalsPageState extends ConsumerState<MyGoalsPage> {
  List<dynamic> _goals = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadGoals();
  }

  Future<void> _loadGoals() async {
    setState(() => _loading = true);
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/goals/my-goals');
      if (response.statusCode == 200) {
        setState(() {
          _goals = response.data is List ? response.data : (response.data['data'] ?? []);
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
        title: const Text('أهدافي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadGoals,
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
                        onPressed: _loadGoals,
                        child: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                )
              : _goals.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.flag_outlined, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'لا توجد أهداف',
                            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadGoals,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _goals.length,
                        itemBuilder: (context, index) {
                          final goal = _goals[index];
                          return _GoalCard(goal: goal, onUpdate: _loadGoals);
                        },
                      ),
                    ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  final dynamic goal;
  final VoidCallback onUpdate;

  const _GoalCard({required this.goal, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final progress = (goal['progress'] ?? 0).toDouble();
    final status = goal['status'] ?? 'IN_PROGRESS';
    final dueDate = goal['dueDate'];
    
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
                    goal['title'] ?? 'هدف',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                _buildStatusChip(status),
              ],
            ),
            if (goal['description'] != null) ...[
              const SizedBox(height: 8),
              Text(
                goal['description'],
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                const Text('التقدم: ', style: TextStyle(fontWeight: FontWeight.w500)),
                Expanded(
                  child: LinearProgressIndicator(
                    value: progress / 100,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(_getProgressColor(progress)),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${progress.toInt()}%',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _getProgressColor(progress),
                  ),
                ),
              ],
            ),
            if (dueDate != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    'الموعد النهائي: ${_formatDate(dueDate)}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _showUpdateProgressDialog(context),
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('تحديث التقدم'),
                ),
              ],
            ),
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
        label = 'قيد التنفيذ';
        break;
      case 'NOT_STARTED':
        color = Colors.grey;
        label = 'لم يبدأ';
        break;
      case 'OVERDUE':
        color = Colors.red;
        label = 'متأخر';
        break;
      default:
        color = Colors.grey;
        label = status;
    }
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white)),
      backgroundColor: color,
      padding: EdgeInsets.zero,
    );
  }

  Color _getProgressColor(double progress) {
    if (progress >= 80) return AppTheme.successColor;
    if (progress >= 50) return Colors.blue;
    if (progress >= 25) return Colors.orange;
    return Colors.red;
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  void _showUpdateProgressDialog(BuildContext context) {
    final controller = TextEditingController(text: goal['progress']?.toString() ?? '0');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تحديث التقدم'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'نسبة التقدم (%)',
            suffixText: '%',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final progress = int.tryParse(controller.text) ?? 0;
                final apiClient = getIt<ApiClient>();
                await apiClient.dio.patch('/goals/${goal['id']}', data: {'progress': progress});
                Navigator.pop(context);
                onUpdate();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('فشل تحديث التقدم: $e')),
                );
              }
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }
}
