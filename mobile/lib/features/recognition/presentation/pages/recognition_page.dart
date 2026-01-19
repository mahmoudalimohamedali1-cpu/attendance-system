import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';

class RecognitionPage extends ConsumerStatefulWidget {
  const RecognitionPage({super.key});

  @override
  ConsumerState<RecognitionPage> createState() => _RecognitionPageState();
}

class _RecognitionPageState extends ConsumerState<RecognitionPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _received = [];
  List<dynamic> _given = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadRecognitions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadRecognitions() async {
    setState(() => _loading = true);
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/recognition/my-recognitions');
      if (response.statusCode == 200) {
        final data = response.data;
        setState(() {
          _received = data['received'] ?? [];
          _given = data['given'] ?? [];
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
        title: const Text('التقدير والمكافآت'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.inbox), text: 'استلمتها'),
            Tab(icon: Icon(Icons.send), text: 'أرسلتها'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRecognitions,
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
                        onPressed: _loadRecognitions,
                        child: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _RecognitionList(recognitions: _received, isReceived: true),
                    _RecognitionList(recognitions: _given, isReceived: false),
                  ],
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showSendRecognitionDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('إرسال تقدير'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );
  }

  void _showSendRecognitionDialog(BuildContext context) {
    final messageController = TextEditingController();
    final searchController = TextEditingController();
    String? selectedUserId;
    String? selectedUserName;
    String selectedType = 'KUDOS';
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('إرسال تقدير'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    labelText: 'ابحث عن زميل',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: selectedUserName != null
                        ? Chip(
                            label: Text(selectedUserName!),
                            onDeleted: () {
                              setDialogState(() {
                                selectedUserId = null;
                                selectedUserName = null;
                              });
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (value) async {
                    try {
                      final apiClient = getIt<ApiClient>();
                      final response = await apiClient.dio.get('/users/search', queryParameters: {'q': value});
                      if (response.statusCode == 200) {
                        final users = response.data['data'] ?? [];
                        if (users.isNotEmpty) {
                          setDialogState(() {
                            selectedUserId = users[0]['id'];
                            selectedUserName = '${users[0]['firstName']} ${users[0]['lastName']}';
                          });
                        }
                      }
                    } catch (e) {
                      // Ignore search errors
                    }
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'نوع التقدير'),
                  items: const [
                    DropdownMenuItem(value: 'KUDOS', child: Text('👏 شكر وتقدير')),
                    DropdownMenuItem(value: 'ACHIEVEMENT', child: Text('🏆 إنجاز')),
                    DropdownMenuItem(value: 'TEAMWORK', child: Text('🤝 روح الفريق')),
                    DropdownMenuItem(value: 'INNOVATION', child: Text('💡 إبداع')),
                    DropdownMenuItem(value: 'CUSTOMER_SERVICE', child: Text('⭐ خدمة العملاء')),
                  ],
                  onChanged: (value) => setDialogState(() => selectedType = value!),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'رسالة التقدير',
                    hintText: 'اكتب رسالة تقدير لزميلك...',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء'),
            ),
            ElevatedButton(
              onPressed: selectedUserId == null
                  ? null
                  : () async {
                      try {
                        final apiClient = getIt<ApiClient>();
                        await apiClient.dio.post('/recognition', data: {
                          'recipientId': selectedUserId,
                          'type': selectedType,
                          'message': messageController.text,
                        });
                        Navigator.pop(context);
                        _loadRecognitions();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('تم إرسال التقدير بنجاح!')),
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('فشل إرسال التقدير: $e')),
                        );
                      }
                    },
              child: const Text('إرسال'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecognitionList extends StatelessWidget {
  final List<dynamic> recognitions;
  final bool isReceived;

  const _RecognitionList({required this.recognitions, required this.isReceived});

  @override
  Widget build(BuildContext context) {
    if (recognitions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isReceived ? Icons.inbox : Icons.send,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              isReceived ? 'لم تستلم أي تقدير بعد' : 'لم ترسل أي تقدير بعد',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: recognitions.length,
      itemBuilder: (context, index) {
        final recognition = recognitions[index];
        return _RecognitionCard(recognition: recognition, isReceived: isReceived);
      },
    );
  }
}

class _RecognitionCard extends StatelessWidget {
  final dynamic recognition;
  final bool isReceived;

  const _RecognitionCard({required this.recognition, required this.isReceived});

  @override
  Widget build(BuildContext context) {
    final user = isReceived ? recognition['sender'] : recognition['recipient'];
    final type = recognition['type'] ?? 'KUDOS';
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: _getTypeColor(type).withValues(alpha: 0.2),
                  child: Text(_getTypeEmoji(type), style: const TextStyle(fontSize: 20)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isReceived ? 'من: ' : 'إلى: ',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      Text(
                        '${user?['firstName'] ?? ''} ${user?['lastName'] ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(_getTypeName(type), style: const TextStyle(fontSize: 11)),
                  backgroundColor: _getTypeColor(type).withValues(alpha: 0.1),
                ),
              ],
            ),
            if (recognition['message'] != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  recognition['message'],
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              _formatDate(recognition['createdAt']),
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'KUDOS':
        return Colors.blue;
      case 'ACHIEVEMENT':
        return Colors.amber;
      case 'TEAMWORK':
        return Colors.green;
      case 'INNOVATION':
        return Colors.purple;
      case 'CUSTOMER_SERVICE':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getTypeEmoji(String type) {
    switch (type) {
      case 'KUDOS':
        return '👏';
      case 'ACHIEVEMENT':
        return '🏆';
      case 'TEAMWORK':
        return '🤝';
      case 'INNOVATION':
        return '💡';
      case 'CUSTOMER_SERVICE':
        return '⭐';
      default:
        return '🎉';
    }
  }

  String _getTypeName(String type) {
    switch (type) {
      case 'KUDOS':
        return 'شكر';
      case 'ACHIEVEMENT':
        return 'إنجاز';
      case 'TEAMWORK':
        return 'فريق';
      case 'INNOVATION':
        return 'إبداع';
      case 'CUSTOMER_SERVICE':
        return 'خدمة';
      default:
        return type;
    }
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
