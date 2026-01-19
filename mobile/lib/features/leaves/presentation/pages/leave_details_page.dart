import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/leaves_bloc.dart';

class LeaveDetailsPage extends StatefulWidget {
  final String leaveId;
  const LeaveDetailsPage({super.key, required this.leaveId});

  @override
  State<LeaveDetailsPage> createState() => _LeaveDetailsPageState();
}

class _LeaveDetailsPageState extends State<LeaveDetailsPage> {
  final _notesController = TextEditingController();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    context.read<LeavesBloc>().add(GetLeaveDetailsEvent(widget.leaveId));
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
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

  String _getStatusLabel(String status) {
    final labels = {
      'PENDING': 'قيد المراجعة',
      'MGR_APPROVED': 'موافقة المدير',
      'MGR_REJECTED': 'رفض المدير',
      'APPROVED': 'موافق عليها',
      'REJECTED': 'مرفوضة',
      'DELAYED': 'مؤجل',
    };
    return labels[status] ?? status;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'MGR_APPROVED':
        return Colors.blue;
      case 'APPROVED':
        return AppTheme.successColor;
      case 'MGR_REJECTED':
      case 'REJECTED':
        return AppTheme.errorColor;
      case 'DELAYED':
        return Colors.purple;
      default:
        return AppTheme.warningColor;
    }
  }

  void _showApprovalDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('الموافقة على الطلب'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('هل أنت متأكد من الموافقة على هذا الطلب؟'),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'ملاحظات (اختياري)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isProcessing = true);
              context.read<LeavesBloc>().add(
                    ApproveLeaveEvent(
                      widget.leaveId,
                      notes: _notesController.text.trim().isEmpty
                          ? null
                          : _notesController.text.trim(),
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
            ),
            child: const Text('موافق'),
          ),
        ],
      ),
    );
  }

  void _showRejectionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('رفض الطلب'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('هل أنت متأكد من رفض هذا الطلب؟'),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'سبب الرفض (اختياري)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isProcessing = true);
              context.read<LeavesBloc>().add(
                    RejectLeaveEvent(
                      widget.leaveId,
                      notes: _notesController.text.trim().isEmpty
                          ? null
                          : _notesController.text.trim(),
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('رفض'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل طلب الإجازة'),
      ),
      body: BlocConsumer<LeavesBloc, LeavesState>(
        listener: (context, state) {
          if (state is LeaveApprovedSuccess || state is LeaveRejectedSuccess) {
            setState(() => _isProcessing = false);
            _notesController.clear();
            context.pop(); // العودة للصفحة السابقة
          } else if (state is LeavesError) {
            setState(() => _isProcessing = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.errorColor,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is LeavesLoading || _isProcessing) {
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
                    onPressed: () {
                      context.read<LeavesBloc>().add(GetLeaveDetailsEvent(widget.leaveId));
                    },
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is LeaveDetailsLoaded) {
            final leave = state.leaveDetails;
            final user = leave['user'] ?? {};
            final startDate = leave['startDate'] != null
                ? DateFormat('yyyy-MM-dd').parse(leave['startDate'].toString().split('T')[0])
                : null;
            final endDate = leave['endDate'] != null
                ? DateFormat('yyyy-MM-dd').parse(leave['endDate'].toString().split('T')[0])
                : null;
            final status = leave['status'] ?? 'PENDING';
            final attachments = leave['attachments'] as List? ?? [];

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Employee Info Card
                  Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 30,
                                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                child: Text(
                                  '${(user['firstName'] ?? '').toString().substring(0, 1)}${(user['lastName'] ?? '').toString().substring(0, 1)}',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}',
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
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
                                    if (user['employeeCode'] != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'كود: ${user['employeeCode']}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[500],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Leave Details Card
                  Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildDetailRow('النوع', _getTypeLabel(leave['type'] ?? '')),
                          const Divider(),
                          _buildDetailRow('الحالة', _getStatusLabel(status),
                              color: _getStatusColor(status)),
                          const Divider(),
                          if (startDate != null && endDate != null) ...[
                            _buildDetailRow(
                              'من تاريخ',
                              DateFormat('dd/MM/yyyy').format(startDate),
                              icon: Icons.calendar_today,
                            ),
                            const Divider(),
                            _buildDetailRow(
                              'إلى تاريخ',
                              DateFormat('dd/MM/yyyy').format(endDate),
                              icon: Icons.calendar_today,
                            ),
                            const Divider(),
                          ],
                          if (leave['requestedDays'] != null)
                            _buildDetailRow(
                              'عدد الأيام',
                              '${leave['requestedDays']} يوم',
                              icon: Icons.event,
                            ),
                          if (leave['reason'] != null &&
                              leave['reason'].toString().isNotEmpty) ...[
                            const Divider(),
                            _buildDetailRow('السبب', leave['reason'], icon: Icons.note),
                          ],
                        ],
                      ),
                    ),
                  ),

                  // Attachments Card
                  if (attachments.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.attach_file, color: AppTheme.primaryColor),
                                const SizedBox(width: 8),
                                Text(
                                  'المرفقات (${attachments.length})',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ...attachments.map((attachment) {
                              final url = attachment['url'] ?? attachment['path'] ?? '';
                              final filename = attachment['originalName'] ?? attachment['filename'] ?? '';
                              return ListTile(
                                leading: Icon(
                                  url.toLowerCase().contains('.pdf')
                                      ? Icons.picture_as_pdf
                                      : Icons.image,
                                  color: AppTheme.primaryColor,
                                ),
                                title: Text(filename),
                                trailing: IconButton(
                                  icon: const Icon(Icons.open_in_new),
                                  onPressed: () {
                                    // يمكن فتح الملف في متصفح أو تطبيق خارجي
                                  },
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // Approval Notes (if exists)
                  if (leave['approverNotes'] != null &&
                      leave['approverNotes'].toString().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ملاحظات الموافق',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(leave['approverNotes']),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // Action Buttons (for pending or MGR_APPROVED requests)
                  if (status == 'PENDING' || status == 'MGR_APPROVED') ...[
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _showRejectionDialog,
                            icon: const Icon(Icons.close),
                            label: const Text('رفض'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.errorColor,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _showApprovalDialog,
                            icon: const Icon(Icons.check),
                            label: const Text('موافق'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.successColor,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {IconData? icon, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 20, color: Colors.grey[600]),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

