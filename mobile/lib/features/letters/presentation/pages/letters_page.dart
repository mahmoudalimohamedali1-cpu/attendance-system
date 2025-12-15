import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/letters_bloc.dart';

class LettersPage extends StatefulWidget {
  const LettersPage({super.key});

  @override
  State<LettersPage> createState() => _LettersPageState();
}

class _LettersPageState extends State<LettersPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _currentStatus = 'NEW';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
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
      _loadLetters();
    }
  }

  void _loadLetters() {
    context.read<LettersBloc>().add(GetMyLettersEvent(status: _currentStatus));
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
      'APPROVED': 'موافق عليها',
      'REJECTED': 'مرفوضة',
      'CANCELLED': 'ملغاة',
    };
    return labels[status] ?? status;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return AppTheme.successColor;
      case 'REJECTED':
        return AppTheme.errorColor;
      case 'CANCELLED':
        return Colors.grey;
      default:
        return AppTheme.warningColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الخطابات'),
        actions: [
          if (_currentStatus != 'NEW')
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadLetters,
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'جديد'),
            Tab(text: 'قيد المراجعة'),
            Tab(text: 'موافق عليها'),
            Tab(text: 'مرفوضة'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/letters/new');
        },
        icon: const Icon(Icons.add),
        label: const Text('طلب خطاب'),
      ),
      body: _currentStatus == 'NEW'
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'لا توجد خطابات',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/letters/new'),
                    icon: const Icon(Icons.add),
                    label: const Text('إنشاء طلب خطاب جديد'),
                  ),
                ],
              ),
            )
          : BlocBuilder<LettersBloc, LettersState>(
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
                        Text(state.message),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadLetters,
                          child: const Text('إعادة المحاولة'),
                        ),
                      ],
                    ),
                  );
                }

                if (state is LettersLoaded) {
                  final letters = state.letters;

                  if (letters.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'لا توجد خطابات',
                            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: letters.length,
                    itemBuilder: (context, index) {
                      final letter = letters[index];
                      final createdAt = letter['createdAt'] != null
                          ? DateTime.parse(letter['createdAt'].toString())
                          : null;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
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
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Chip(
                                    label: Text(
                                      _getTypeLabel(letter['type'] ?? ''),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                                  ),
                                  Chip(
                                    label: Text(
                                      _getStatusLabel(letter['status'] ?? ''),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    backgroundColor: _getStatusColor(letter['status'] ?? '').withOpacity(0.1),
                                    labelStyle: TextStyle(
                                      color: _getStatusColor(letter['status'] ?? ''),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              if (letter['notes'] != null && letter['notes'].toString().isNotEmpty) ...[
                                Text(
                                  letter['notes'],
                                  style: const TextStyle(fontSize: 14),
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                              ],
                              if (letter['attachments'] != null &&
                                  (letter['attachments'] as List).isNotEmpty) ...[
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
                                const SizedBox(height: 8),
                              ],
                              if (createdAt != null) ...[
                                Row(
                                  children: [
                                    Icon(Icons.access_time, size: 14, color: Colors.grey[500]),
                                    const SizedBox(width: 4),
                                    Text(
                                      DateFormat('dd/MM/yyyy HH:mm').format(createdAt),
                                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                                    ),
                                  ],
                                ),
                              ],
                              if (letter['status'] == 'PENDING') ...[
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton(
                                      onPressed: () {
                                        // Cancel letter
                                        showDialog(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: const Text('إلغاء الطلب'),
                                            content: const Text('هل أنت متأكد من إلغاء هذا الطلب؟'),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.pop(context),
                                                child: const Text('إلغاء'),
                                              ),
                                              ElevatedButton(
                                                onPressed: () {
                                                  Navigator.pop(context);
                                                  context.read<LettersBloc>().add(
                                                        CancelLetterEvent(letter['id']),
                                                      );
                                                },
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppTheme.errorColor,
                                                ),
                                                child: const Text('نعم، إلغاء'),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                      child: const Text('إلغاء'),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  );
                }

                return const SizedBox.shrink();
              },
            ),
    );
  }
}

