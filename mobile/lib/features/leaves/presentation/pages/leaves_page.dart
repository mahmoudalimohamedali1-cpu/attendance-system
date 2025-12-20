import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/services/permissions_service.dart';
import '../bloc/leaves_bloc.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class LeavesPage extends StatefulWidget {
  const LeavesPage({super.key});

  @override
  State<LeavesPage> createState() => _LeavesPageState();
}

class _LeavesPageState extends State<LeavesPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _currentStatus = 'NEW'; // Start with NEW tab

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this); // 4 tabs now
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    setState(() {
      switch (_tabController.index) {
        case 0:
          _currentStatus = 'NEW';
          break;
        case 1:
          _currentStatus = 'PENDING';
          break;
        case 2:
          _currentStatus = 'APPROVED';
          break;
        case 3:
          _currentStatus = 'REJECTED';
          break;
      }
    });
    if (_currentStatus != 'NEW') {
      _loadLeaves();
    }
  }

  void _loadLeaves() {
    context.read<LeavesBloc>().add(GetMyLeavesEvent(status: _currentStatus));
  }

  /// Check if user can view pending requests (has permission or is admin/manager)
  bool _canViewPendingRequests(String userRole) {
    // Admin and Manager always have access
    if (userRole == 'MANAGER' || userRole == 'ADMIN') {
      return true;
    }
    
    // Check for specific permissions
    final permissionsService = getPermissionsService();
    return permissionsService.hasAnyPermission(['LEAVES_VIEW', 'LEAVES_APPROVE']);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الطلبات'),
        actions: [
          // زر الطلبات المعلقة (متاح للمديرين أو من لديه صلاحيات)
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, authState) {
              if (authState is AuthAuthenticated) {
                final userRole = authState.user.role;
                print('👤 User role: $userRole');
                
                if (_canViewPendingRequests(userRole)) {
                  return IconButton(
                    icon: const Icon(Icons.pending_actions),
                    tooltip: 'الطلبات المعلقة',
                    onPressed: () {
                      print('🔘 Navigating to unified pending requests page');
                      context.push('/pending');
                    },
                  );
                } else {
                  print('⚠️ User role $userRole does not have permission to view pending leaves');
                }
              }
              return const SizedBox.shrink();
            },
          ),
          if (_currentStatus != 'NEW')
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadLeaves,
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(12),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: Colors.grey[600],
              labelStyle: const TextStyle(fontSize: 12),
              tabs: const [
                Tab(text: 'جديد'),
                Tab(text: 'قيد المراجعة'),
                Tab(text: 'مقبولة'),
                Tab(text: 'مرفوضة'),
              ],
            ),
          ),
          Expanded(
            child: _currentStatus == 'NEW'
                ? _buildNewRequestTab()
                : _buildRequestsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildNewRequestTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'اختر نوع الطلب',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _RequestTypeCard(
            icon: Icons.beach_access,
            title: 'طلب إجازة',
            subtitle: 'إجازة سنوية، مرضية، شخصية، طارئة',
            color: AppTheme.primaryColor,
            onTap: () => context.push('/leaves/new'),
          ),
          _RequestTypeCard(
            icon: Icons.exit_to_app,
            title: 'طلب إذن خروج',
            subtitle: 'خروج مبكر أو تأخير',
            color: Colors.orange,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('قريباً...')),
              );
            },
          ),
          _RequestTypeCard(
            icon: Icons.schedule,
            title: 'طلب عمل إضافي',
            subtitle: 'ساعات إضافية',
            color: Colors.green,
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('قريباً...')),
              );
            },
          ),
          _RequestTypeCard(
            icon: Icons.monetization_on,
            title: 'طلب زيادة',
            subtitle: 'زيادة راتب، بدل، مكافأة',
            color: Colors.purple,
            onTap: () => context.push('/raises/new'),
          ),
          const SizedBox(height: 24),
          const Text(
            'عرض طلباتي',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _RequestTypeCard(
            icon: Icons.trending_up,
            title: 'طلبات الزيادة',
            subtitle: 'عرض جميع طلبات الزيادة الخاصة بي',
            color: Colors.teal,
            onTap: () => context.push('/raises'),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsList() {
    return BlocBuilder<LeavesBloc, LeavesState>(
      builder: (context, state) {
        if (state is LeavesLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is LeavesError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'حدث خطأ: ${state.message}',
                  style: TextStyle(color: Colors.grey[600]),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadLeaves,
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          );
        }

        if (state is LeavesLoaded) {
          if (state.leaves.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.event_busy, size: 64, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد طلبات',
                    style: TextStyle(color: Colors.grey[600], fontSize: 16),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _loadLeaves(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.leaves.length,
              itemBuilder: (context, index) {
                final leave = state.leaves[index];
                return _LeaveCard(
                  id: leave['id'] ?? '',
                  type: _getLeaveTypeLabel(leave['type'] ?? ''),
                  startDate: _formatDate(leave['startDate']),
                  endDate: _formatDate(leave['endDate']),
                  status: leave['status'] ?? '',
                  reason: leave['reason'] ?? '',
                  onCancel: () => _cancelLeave(leave['id']),
                );
              },
            ),
          );
        }

        return const Center(child: Text('جاري التحميل...'));
      },
    );
  }

  String _getLeaveTypeLabel(String type) {
    switch (type) {
      case 'ANNUAL':
        return 'إجازة سنوية';
      case 'SICK':
        return 'إجازة مرضية';
      case 'PERSONAL':
        return 'إجازة شخصية';
      case 'EMERGENCY':
        return 'إجازة طارئة';
      case 'EARLY_LEAVE':
        return 'خروج مبكر';
      default:
        return 'أخرى';
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('d MMM yyyy', 'ar').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  void _cancelLeave(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إلغاء الطلب'),
        content: const Text('هل أنت متأكد من إلغاء طلب الإجازة؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('لا'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<LeavesBloc>().add(CancelLeaveEvent(id));
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('نعم، إلغاء'),
          ),
        ],
      ),
    );
  }
}

class _LeaveCard extends StatelessWidget {
  final String id;
  final String type;
  final String startDate;
  final String endDate;
  final String status;
  final String reason;
  final VoidCallback onCancel;

  const _LeaveCard({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.reason,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (status.toUpperCase()) {
      case 'PENDING':
        statusColor = AppTheme.warningColor;
        statusText = 'قيد المراجعة';
        statusIcon = Icons.hourglass_empty;
        break;
      case 'MGR_APPROVED':
        statusColor = Colors.blue;
        statusText = 'موافقة المدير';
        statusIcon = Icons.thumb_up;
        break;
      case 'MGR_REJECTED':
        statusColor = AppTheme.errorColor;
        statusText = 'رفض المدير';
        statusIcon = Icons.thumb_down;
        break;
      case 'APPROVED':
        statusColor = AppTheme.successColor;
        statusText = 'مقبول';
        statusIcon = Icons.check_circle;
        break;
      case 'REJECTED':
        statusColor = AppTheme.errorColor;
        statusText = 'مرفوض';
        statusIcon = Icons.cancel;
        break;
      case 'DELAYED':
        statusColor = Colors.purple;
        statusText = 'مؤجل';
        statusIcon = Icons.schedule;
        break;
      default:
        statusColor = Colors.grey;
        statusText = status;
        statusIcon = Icons.help;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.event_available,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      type,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.w500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'من',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      Text(startDate),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward, color: Colors.grey),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'إلى',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      Text(endDate),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'السبب: $reason',
              style: TextStyle(color: Colors.grey[600]),
            ),
            
            if (status.toUpperCase() == 'PENDING') ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.cancel, size: 18),
                label: const Text('إلغاء الطلب'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.errorColor,
                  side: const BorderSide(color: AppTheme.errorColor),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RequestTypeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _RequestTypeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }
}
