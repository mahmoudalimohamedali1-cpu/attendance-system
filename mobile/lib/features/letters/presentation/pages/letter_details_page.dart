import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/letters_bloc.dart';

class LetterDetailsPage extends StatefulWidget {
  final String letterId;
  const LetterDetailsPage({super.key, required this.letterId});

  @override
  State<LetterDetailsPage> createState() => _LetterDetailsPageState();
}

class _LetterDetailsPageState extends State<LetterDetailsPage> {
  final _notesController = TextEditingController();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    context.read<LettersBloc>().add(GetLetterDetailsEvent(widget.letterId));
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String _getTypeLabel(String type) {
    final labels = {
      'REQUEST': 'طلب',
      'COMPLAINT': 'شكوى',
      'CERTIFICATION': 'تصديق',
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
              context.read<LettersBloc>().add(
                    ApproveLetterEvent(
                      widget.letterId,
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
              context.read<LettersBloc>().add(
                    RejectLetterEvent(
                      widget.letterId,
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
        title: const Text('تفاصيل طلب الخطاب'),
      ),
      body: BlocConsumer<LettersBloc, LettersState>(
        listener: (context, state) {
          if (state is LetterApprovedSuccess || state is LetterRejectedSuccess) {
            setState(() => _isProcessing = false);
            _notesController.clear();
            context.pop();
          } else if (state is LettersError) {
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
          if (state is LettersLoading || _isProcessing) {
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
                    onPressed: () {
                      context.read<LettersBloc>().add(GetLetterDetailsEvent(widget.letterId));
                    },
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is LetterDetailsLoaded) {
            final letter = state.letterDetails;
            final user = letter['user'] ?? {};
            final status = letter['status'] ?? 'PENDING';
            final attachments = letter['attachments'] as List? ?? [];

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

                  // Letter Details Card
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
                          _buildDetailRow('النوع', _getTypeLabel(letter['type'] ?? '')),
                          const Divider(),
                          _buildDetailRow('الحالة', _getStatusLabel(status),
                              color: _getStatusColor(status)),
                          if (letter['notes'] != null &&
                              letter['notes'].toString().isNotEmpty) ...[
                            const Divider(),
                            _buildDetailRow('الملاحظات', letter['notes'], icon: Icons.note),
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
                                onTap: () async {
                                  if (url.isEmpty) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('رابط الملف غير متوفر')),
                                    );
                                    return;
                                  }
                                  final fullUrl = url.startsWith('http') 
                                      ? url 
                                      : 'http://72.61.239.170:3000$url';
                                  final uri = Uri.parse(fullUrl);
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('لا يمكن فتح الملف')),
                                      );
                                    }
                                  }
                                },
                                leading: Icon(
                                  url.toLowerCase().contains('.pdf')
                                      ? Icons.picture_as_pdf
                                      : Icons.image,
                                  color: AppTheme.primaryColor,
                                ),
                                title: Text(filename),
                                subtitle: const Text('اضغط لفتح المرفق'),
                                trailing: const Icon(Icons.open_in_new, color: AppTheme.primaryColor),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // Approval Notes (if exists)
                  if (letter['approverNotes'] != null &&
                      letter['approverNotes'].toString().isNotEmpty) ...[
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
                            Text(letter['approverNotes']),
                          ],
                        ),
                      ),
                    ),
                  ],

                  // HR Attachments (signed letter from HR)
                  if ((letter['hrAttachments'] as List?)?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 16),
                    Card(
                      elevation: 2,
                      color: Colors.green[50],
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
                                Icon(Icons.file_download, color: Colors.green[700]),
                                const SizedBox(width: 8),
                                Text(
                                  'الخطاب الموقع من HR',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green[700],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ...(letter['hrAttachments'] as List).map((attachment) {
                              final url = attachment['url'] ?? attachment['path'] ?? '';
                              final filename = attachment['originalName'] ?? attachment['filename'] ?? 'ملف';
                              return ListTile(
                                onTap: () async {
                                  final fullUrl = url.startsWith('http') 
                                      ? url 
                                      : 'http://72.61.239.170:3000$url';
                                  final uri = Uri.parse(fullUrl);
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('لا يمكن فتح الملف')),
                                      );
                                    }
                                  }
                                },
                                leading: Icon(
                                  url.toLowerCase().contains('.pdf')
                                      ? Icons.picture_as_pdf
                                      : Icons.image,
                                  color: Colors.green[700],
                                ),
                                title: Text(filename),
                                subtitle: const Text('اضغط لتحميل الخطاب'),
                                trailing: Icon(Icons.download, color: Colors.green[700]),
                              );
                            }),
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

