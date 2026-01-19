import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/leaves_bloc.dart';

class PendingLeavesPage extends StatefulWidget {
  const PendingLeavesPage({super.key});

  @override
  State<PendingLeavesPage> createState() => _PendingLeavesPageState();
}

class _PendingLeavesPageState extends State<PendingLeavesPage> {
  @override
  void initState() {
    super.initState();
    debugPrint('🔄 Initializing PendingLeavesPage');
    context.read<LeavesBloc>().add(const GetPendingLeavesEvent());
  }

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('الطلبات المعلقة'),
      ),
      body: BlocConsumer<LeavesBloc, LeavesState>(
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
          } else if (state is LeavesError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.errorColor,
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
                  Text(state.message, style: const TextStyle(fontSize: 16)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<LeavesBloc>().add(const GetPendingLeavesEvent());
                    },
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is LeavesLoaded) {
            final leaves = state.leaves;
            debugPrint('📋 LeavesLoaded state: ${leaves.length} leaves');

            if (leaves.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      'لا توجد طلبات معلقة',
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<LeavesBloc>().add(const GetPendingLeavesEvent());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: leaves.length,
                itemBuilder: (context, index) {
                  final leave = leaves[index];
                  final user = leave['user'] ?? {};
                  final startDate = leave['startDate'] != null
                      ? DateFormat('yyyy-MM-dd').parse(leave['startDate'].toString().split('T')[0])
                      : null;
                  final endDate = leave['endDate'] != null
                      ? DateFormat('yyyy-MM-dd').parse(leave['endDate'].toString().split('T')[0])
                      : null;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: InkWell(
                      onTap: () {
                        context.push('/leaves/details/${leave['id']}');
                      },
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
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Chip(
                                  label: Text(
                                    _getTypeLabel(leave['type'] ?? ''),
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                ),
                              ],
                            ),
                            if (user['jobTitle'] != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                user['jobTitle'],
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                                const SizedBox(width: 8),
                                Text(
                                  startDate != null && endDate != null
                                      ? '${DateFormat('dd/MM/yyyy').format(startDate)} - ${DateFormat('dd/MM/yyyy').format(endDate)}'
                                      : 'تاريخ غير محدد',
                                  style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                ),
                              ],
                            ),
                            if (leave['requestedDays'] != null) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.event, size: 16, color: Colors.grey[600]),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${leave['requestedDays']} يوم',
                                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                  ),
                                ],
                              ),
                            ],
                            if (leave['reason'] != null && leave['reason'].toString().isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                leave['reason'],
                                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            if (leave['attachments'] != null && 
                                (leave['attachments'] as List).isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.attach_file, size: 16, color: Colors.grey[600]),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${(leave['attachments'] as List).length} مرفق',
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
                                  onPressed: () {
                                    context.push('/leaves/details/${leave['id']}');
                                  },
                                  icon: const Icon(Icons.visibility, size: 18),
                                  label: const Text('عرض التفاصيل'),
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
      ),
    );
  }
}

