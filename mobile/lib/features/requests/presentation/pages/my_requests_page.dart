import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';

class MyRequestsPage extends StatefulWidget {
  const MyRequestsPage({super.key});

  @override
  State<MyRequestsPage> createState() => _MyRequestsPageState();
}

class _MyRequestsPageState extends State<MyRequestsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  List<dynamic> _leaves = [];
  List<dynamic> _letters = [];
  List<dynamic> _advances = [];
  List<dynamic> _raises = [];
  
  bool _loadingLeaves = true;
  bool _loadingLetters = true;
  bool _loadingAdvances = true;
  bool _loadingRaises = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAllRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllRequests() async {
    _loadLeaves();
    _loadLetters();
    _loadAdvances();
    _loadRaises();
  }

  Future<void> _loadLeaves() async {
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/leaves/my-requests');
      if (response.statusCode == 200) {
        setState(() {
          _leaves = response.data['data'] ?? [];
          _loadingLeaves = false;
        });
      }
    } catch (e) {
      setState(() => _loadingLeaves = false);
    }
  }

  Future<void> _loadLetters() async {
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/letters/my-requests');
      if (response.statusCode == 200) {
        setState(() {
          _letters = response.data['data'] ?? [];
          _loadingLetters = false;
        });
      }
    } catch (e) {
      setState(() => _loadingLetters = false);
    }
  }

  Future<void> _loadAdvances() async {
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/advances/my-requests');
      if (response.statusCode == 200) {
        setState(() {
          _advances = response.data['data'] ?? [];
          _loadingAdvances = false;
        });
      }
    } catch (e) {
      setState(() => _loadingAdvances = false);
    }
  }

  Future<void> _loadRaises() async {
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/raises/my-requests');
      if (response.statusCode == 200) {
        setState(() {
          _raises = response.data['data'] ?? [];
          _loadingRaises = false;
        });
      }
    } catch (e) {
      setState(() => _loadingRaises = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('طلباتي'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: AppTheme.primaryColor,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: isDark ? Colors.grey[400] : Colors.grey[600],
          tabs: [
            Tab(
              icon: const Icon(Icons.beach_access, size: 20),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('إجازات'),
                  if (_leaves.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _buildBadge(_leaves.where((l) => l['status'] == 'PENDING').length),
                  ],
                ],
              ),
            ),
            Tab(
              icon: const Icon(Icons.description, size: 20),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('خطابات'),
                  if (_letters.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _buildBadge(_letters.where((l) => l['status'] == 'PENDING').length),
                  ],
                ],
              ),
            ),
            Tab(
              icon: const Icon(Icons.account_balance_wallet, size: 20),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('سلف'),
                  if (_advances.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _buildBadge(_advances.where((a) => a['status'] == 'PENDING').length),
                  ],
                ],
              ),
            ),
            Tab(
              icon: const Icon(Icons.trending_up, size: 20),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('زيادات'),
                  if (_raises.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    _buildBadge(_raises.where((r) => r['status'] == 'PENDING').length),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.add),
            onSelected: (value) {
              switch (value) {
                case 'leave':
                  context.push('/leaves/new');
                  break;
                case 'letter':
                  context.push('/letters/new');
                  break;
                case 'advance':
                  context.push('/advances/new');
                  break;
                case 'raise':
                  context.push('/raises/new');
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'leave', child: Text('طلب إجازة')),
              const PopupMenuItem(value: 'letter', child: Text('طلب خطاب')),
              const PopupMenuItem(value: 'advance', child: Text('طلب سلفة')),
              const PopupMenuItem(value: 'raise', child: Text('طلب زيادة')),
            ],
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _RequestsList(
            items: _leaves,
            loading: _loadingLeaves,
            type: 'leave',
            onRefresh: _loadLeaves,
            onTap: (item) => context.push('/leaves/details/${item['id']}'),
          ),
          _RequestsList(
            items: _letters,
            loading: _loadingLetters,
            type: 'letter',
            onRefresh: _loadLetters,
            onTap: (item) => context.push('/letters/details/${item['id']}'),
          ),
          _RequestsList(
            items: _advances,
            loading: _loadingAdvances,
            type: 'advance',
            onRefresh: _loadAdvances,
            onTap: (item) => context.push('/advances/details/${item['id']}'),
          ),
          _RequestsList(
            items: _raises,
            loading: _loadingRaises,
            type: 'raise',
            onRefresh: _loadRaises,
            onTap: (item) => context.push('/raises/details/${item['id']}'),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(int count) {
    if (count == 0) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.red,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: const TextStyle(color: Colors.white, fontSize: 10),
      ),
    );
  }
}

class _RequestsList extends StatelessWidget {
  final List<dynamic> items;
  final bool loading;
  final String type;
  final VoidCallback onRefresh;
  final Function(dynamic) onTap;

  const _RequestsList({
    required this.items,
    required this.loading,
    required this.type,
    required this.onRefresh,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_getEmptyIcon(), size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'لا توجد طلبات',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return _RequestCard(
            item: item,
            type: type,
            onTap: () => onTap(item),
          );
        },
      ),
    );
  }

  IconData _getEmptyIcon() {
    switch (type) {
      case 'leave':
        return Icons.beach_access;
      case 'letter':
        return Icons.description;
      case 'advance':
        return Icons.account_balance_wallet;
      case 'raise':
        return Icons.trending_up;
      default:
        return Icons.assignment;
    }
  }
}

class _RequestCard extends StatelessWidget {
  final dynamic item;
  final String type;
  final VoidCallback onTap;

  const _RequestCard({
    required this.item,
    required this.type,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = item['status'] ?? 'PENDING';
    final createdAt = item['createdAt'];
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _getTypeColor().withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_getTypeIcon(), color: _getTypeColor(), size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getTitle(),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(createdAt),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              _buildStatusChip(status),
            ],
          ),
        ),
      ),
    );
  }

  String _getTitle() {
    switch (type) {
      case 'leave':
        final leaveType = item['leaveType'] ?? item['type'] ?? 'إجازة';
        return _getLeaveTypeName(leaveType);
      case 'letter':
        final letterType = item['type'] ?? 'خطاب';
        return _getLetterTypeName(letterType);
      case 'advance':
        final amount = item['amount'] ?? 0;
        return 'سلفة بقيمة $amount ر.س';
      case 'raise':
        return 'طلب زيادة راتب';
      default:
        return 'طلب';
    }
  }

  String _getLeaveTypeName(String type) {
    final names = {
      'ANNUAL': 'إجازة سنوية',
      'SICK': 'إجازة مرضية',
      'PERSONAL': 'إجازة شخصية',
      'EMERGENCY': 'إجازة طارئة',
      'UNPAID': 'إجازة بدون راتب',
      'MATERNITY': 'إجازة أمومة',
      'PATERNITY': 'إجازة أبوة',
    };
    return names[type] ?? type;
  }

  String _getLetterTypeName(String type) {
    final names = {
      'SALARY_DEFINITION': 'تعريف راتب',
      'EXPERIENCE': 'خطاب خبرة',
      'NOC': 'عدم ممانعة',
      'RESIGNATION': 'استقالة',
    };
    return names[type] ?? type;
  }

  IconData _getTypeIcon() {
    switch (type) {
      case 'leave':
        return Icons.beach_access;
      case 'letter':
        return Icons.description;
      case 'advance':
        return Icons.account_balance_wallet;
      case 'raise':
        return Icons.trending_up;
      default:
        return Icons.assignment;
    }
  }

  Color _getTypeColor() {
    switch (type) {
      case 'leave':
        return Colors.blue;
      case 'letter':
        return Colors.green;
      case 'advance':
        return Colors.orange;
      case 'raise':
        return Colors.purple;
      default:
        return AppTheme.primaryColor;
    }
  }

  Widget _buildStatusChip(String status) {
    Color color;
    String label;
    switch (status) {
      case 'APPROVED':
        color = AppTheme.successColor;
        label = 'موافق';
        break;
      case 'REJECTED':
        color = AppTheme.errorColor;
        label = 'مرفوض';
        break;
      case 'CANCELLED':
        color = Colors.grey;
        label = 'ملغي';
        break;
      case 'MGR_APPROVED':
        color = Colors.blue;
        label = 'موافقة المدير';
        break;
      default:
        color = AppTheme.warningColor;
        label = 'معلق';
    }
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white)),
      backgroundColor: color,
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }
}
