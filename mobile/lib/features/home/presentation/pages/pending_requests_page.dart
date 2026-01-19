import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../leaves/presentation/bloc/leaves_bloc.dart';
import '../../../letters/presentation/bloc/letters_bloc.dart';

/// Unified page showing all pending requests (Leaves, Letters) in tabs
class PendingRequestsPage extends StatefulWidget {
  const PendingRequestsPage({super.key});

  @override
  State<PendingRequestsPage> createState() => _PendingRequestsPageState();
}

class _PendingRequestsPageState extends State<PendingRequestsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    
    // Load leaves on init
    _loadLeaves();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    
    if (_tabController.index == 0) {
      _loadLeaves();
    } else {
      _loadLetters();
    }
  }

  void _loadLeaves() {
    debugPrint('🔄 Loading pending leaves');
    context.read<LeavesBloc>().add(const GetPendingLeavesEvent());
  }

  void _loadLetters() {
    debugPrint('🔄 Loading pending letters');
    context.read<LettersBloc>().add(const GetPendingLettersEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الطلبات المعلقة'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(
              icon: Icon(Icons.event_busy),
              text: 'الإجازات',
            ),
            Tab(
              icon: Icon(Icons.description),
              text: 'الخطابات',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (_tabController.index == 0) {
                _loadLeaves();
              } else {
                _loadLetters();
              }
            },
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _PendingLeavesTab(),
          _PendingLettersTab(),
        ],
      ),
    );
  }
}

/// Tab for pending leave requests
class _PendingLeavesTab extends StatelessWidget {
  String _getTypeLabel(String type) {
    final labels = {
      'ANNUAL': 'إجازة سنوية',
      'SICK': 'إجازة مرضية',
      'PERSONAL': 'إجازة شخصية',
      'EMERGENCY': 'إجازة طارئة',
      'EARLY_LEAVE': 'خروج مبكر',
      'OTHER': 'أخرى',
    };
    return labels[type] ?? type;
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LeavesBloc, LeavesState>(
      listener: (context, state) {
        if (state is LeaveApprovedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تمت الموافقة على الطلب بنجاح'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        } else if (state is LeaveRejectedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم رفض الطلب بنجاح'),
              backgroundColor: AppTheme.warningColor,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is LeavesLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is LeavesError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
                const SizedBox(height: 16),
                Text(state.message),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.read<LeavesBloc>().add(const GetPendingLeavesEvent()),
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
                  Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد إجازات معلقة',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => context.read<LeavesBloc>().add(const GetPendingLeavesEvent()),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.leaves.length,
              itemBuilder: (context, index) {
                final leave = state.leaves[index];
                final user = leave['user'] ?? {};
                final startDate = leave['startDate'] != null
                    ? DateFormat('yyyy-MM-dd').parse(leave['startDate'].toString().split('T')[0])
                    : null;
                final endDate = leave['endDate'] != null
                    ? DateFormat('yyyy-MM-dd').parse(leave['endDate'].toString().split('T')[0])
                    : null;

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: InkWell(
                    onTap: () => context.push('/leaves/details/${leave['id']}'),
                    borderRadius: BorderRadius.circular(12),
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
                                  '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Chip(
                                label: Text(_getTypeLabel(leave['type'] ?? ''), style: const TextStyle(fontSize: 11)),
                                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                          if (user['jobTitle'] != null)
                            Text(user['jobTitle'], style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                              const SizedBox(width: 6),
                              Text(
                                startDate != null && endDate != null
                                    ? '${DateFormat('dd/MM').format(startDate)} - ${DateFormat('dd/MM').format(endDate)}'
                                    : 'تاريخ غير محدد',
                                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                              ),
                              if (leave['requestedDays'] != null) ...[
                                const Spacer(),
                                Text('${leave['requestedDays']} يوم', style: TextStyle(fontSize: 13, color: Colors.grey[700])),
                              ],
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () => context.push('/leaves/details/${leave['id']}'),
                                icon: const Icon(Icons.visibility, size: 16),
                                label: const Text('التفاصيل', style: TextStyle(fontSize: 12)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }
}

/// Tab for pending letter requests
class _PendingLettersTab extends StatelessWidget {
  String _getTypeLabel(String type) {
    final labels = {
      'REQUEST': 'طلب',
      'COMPLAINT': 'شكوى',
      'CERTIFICATION': 'تصديق',
    };
    return labels[type] ?? type;
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LettersBloc, LettersState>(
      listener: (context, state) {
        if (state is LetterApprovedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تمت الموافقة على الخطاب بنجاح'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        } else if (state is LetterRejectedSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم رفض الخطاب بنجاح'),
              backgroundColor: AppTheme.warningColor,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is LettersLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is LettersError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
                const SizedBox(height: 16),
                Text(state.message),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.read<LettersBloc>().add(const GetPendingLettersEvent()),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          );
        }

        if (state is LettersLoaded) {
          if (state.letters.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد خطابات معلقة',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => context.read<LettersBloc>().add(const GetPendingLettersEvent()),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.letters.length,
              itemBuilder: (context, index) {
                final letter = state.letters[index];
                final user = letter['user'] ?? {};

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: InkWell(
                    onTap: () => context.push('/letters/details/${letter['id']}'),
                    borderRadius: BorderRadius.circular(12),
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
                                  '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Chip(
                                label: Text(_getTypeLabel(letter['type'] ?? ''), style: const TextStyle(fontSize: 11)),
                                backgroundColor: Colors.orange.withValues(alpha: 0.1),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                          if (user['jobTitle'] != null)
                            Text(user['jobTitle'], style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                          if (letter['notes'] != null && letter['notes'].toString().isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              letter['notes'],
                              style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () => context.push('/letters/details/${letter['id']}'),
                                icon: const Icon(Icons.visibility, size: 16),
                                label: const Text('التفاصيل', style: TextStyle(fontSize: 12)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }
}
