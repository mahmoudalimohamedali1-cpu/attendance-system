import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/letters_bloc.dart';
import 'letter_details_page.dart';

class PendingLettersPage extends StatefulWidget {
  const PendingLettersPage({super.key});

  @override
  State<PendingLettersPage> createState() => _PendingLettersPageState();
}

class _PendingLettersPageState extends State<PendingLettersPage> {
  @override
  void initState() {
    super.initState();
    print('🔄 Initializing PendingLettersPage');
    context.read<LettersBloc>().add(const GetPendingLettersEvent());
  }

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('الخطابات المعلقة'),
      ),
      body: BlocConsumer<LettersBloc, LettersState>(
        listener: (context, state) {
          if (state is LetterApprovedSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تمت الموافقة على الطلب بنجاح'),
                backgroundColor: AppTheme.successColor,
              ),
            );
          } else if (state is LetterRejectedSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تم رفض الطلب بنجاح'),
                backgroundColor: AppTheme.warningColor,
              ),
            );
          } else if (state is LettersError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppTheme.errorColor,
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
                  Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
                  const SizedBox(height: 16),
                  Text(state.message, style: const TextStyle(fontSize: 16)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<LettersBloc>().add(const GetPendingLettersEvent());
                    },
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is LettersLoaded) {
            final letters = state.letters;
            print('📋 LettersLoaded state: ${letters.length} letters');

            if (letters.isEmpty) {
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
              onRefresh: () async {
                context.read<LettersBloc>().add(const GetPendingLettersEvent());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: letters.length,
                itemBuilder: (context, index) {
                  final letter = letters[index];
                  final user = letter['user'] ?? {};

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: InkWell(
                      onTap: () {
                        context.push('/letters/details/${letter['id']}');
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
                                    _getTypeLabel(letter['type'] ?? ''),
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
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
                            if (letter['notes'] != null && letter['notes'].toString().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(
                                letter['notes'],
                                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            if (letter['attachments'] != null && 
                                (letter['attachments'] as List).isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.attach_file, size: 16, color: Colors.grey[600]),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${(letter['attachments'] as List).length} مرفق',
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
                                    context.push('/letters/details/${letter['id']}');
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

