import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';
import 'package:intl/intl.dart';

class AdvancesPage extends StatefulWidget {
  const AdvancesPage({super.key});

  @override
  State<AdvancesPage> createState() => _AdvancesPageState();
}

class _AdvancesPageState extends State<AdvancesPage> {
  List<dynamic> _advances = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAdvances();
  }

  Future<void> _loadAdvances() async {
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get('/advances/my');
      setState(() {
        _advances = response.data as List<dynamic>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل في تحميل السلف: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED': return Colors.green;
      case 'REJECTED': return Colors.red;
      case 'MGR_APPROVED': return Colors.blue;
      default: return Colors.orange;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'APPROVED': return 'موافق عليه';
      case 'REJECTED': return 'مرفوض';
      case 'MGR_APPROVED': return 'في انتظار HR';
      case 'PENDING': return 'في انتظار المدير';
      default: return status;
    }
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'BANK_TRANSFER': return 'تحويل بنكي';
      case 'CASH': return 'نقداً';
      default: return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('السلف'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadAdvances();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/advances/new'),
        icon: const Icon(Icons.add),
        label: const Text('طلب سلفة'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _advances.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.account_balance_wallet_outlined, size: 80, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('لا توجد طلبات سلف', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => context.push('/advances/new'),
                        icon: const Icon(Icons.add),
                        label: const Text('تقديم طلب سلفة'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadAdvances,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _advances.length,
                    itemBuilder: (context, index) {
                      final advance = _advances[index];
                      final createdAt = DateTime.tryParse(advance['createdAt'] ?? '');
                      
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
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: const Icon(Icons.account_balance_wallet, color: AppTheme.primaryColor),
                                      ),
                                      const SizedBox(width: 12),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _getTypeLabel(advance['type'] ?? ''),
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                          ),
                                          Text(
                                            '${advance['amount']?.toString() ?? '0'} ريال',
                                            style: TextStyle(color: Colors.grey[600]),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(advance['status'] ?? '').withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      _getStatusLabel(advance['status'] ?? ''),
                                      style: TextStyle(
                                        color: _getStatusColor(advance['status'] ?? ''),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'الفترة: ${advance['periodMonths'] ?? 0} شهر',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                  Text(
                                    'الاستقطاع: ${advance['monthlyDeduction']?.toString() ?? '0'} ريال/شهر',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                ],
                              ),
                              if (createdAt != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'تاريخ الطلب: ${DateFormat('d/M/yyyy').format(createdAt)}',
                                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                                ),
                              ],
                              if (advance['status'] == 'APPROVED' && advance['approvedAmount'] != null) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle, color: Colors.green, size: 16),
                                      const SizedBox(width: 8),
                                      Text(
                                        'المبلغ المعتمد: ${advance['approvedAmount']} ريال | الاستقطاع: ${advance['approvedMonthlyDeduction']} ريال/شهر',
                                        style: TextStyle(color: Colors.green.shade700, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
