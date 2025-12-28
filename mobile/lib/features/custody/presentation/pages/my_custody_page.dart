import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/custody_remote_datasource.dart';

class MyCustodyPage extends ConsumerStatefulWidget {
  const MyCustodyPage({super.key});

  @override
  ConsumerState<MyCustodyPage> createState() => _MyCustodyPageState();
}

class _MyCustodyPageState extends ConsumerState<MyCustodyPage> {
  List<CustodyAssignmentModel> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final datasource = ref.read(custodyDataSourceProvider);
      final data = await datasource.getMyCustody();
      setState(() {
        _items = data;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'DELIVERED': return Colors.green;
      case 'PENDING': return Colors.orange;
      case 'APPROVED': return Colors.blue;
      default: return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'DELIVERED': return 'مسلمة';
      case 'PENDING': return 'في انتظار التسليم';
      case 'APPROVED': return 'تمت الموافقة';
      default: return status;
    }
  }

  String _getConditionLabel(String? condition) {
    switch (condition) {
      case 'NEW': return 'جديدة';
      case 'EXCELLENT': return 'ممتازة';
      case 'GOOD': return 'جيدة';
      case 'FAIR': return 'مقبولة';
      case 'POOR': return 'سيئة';
      default: return condition ?? '-';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📦 عهدتي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
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
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                )
              : _items.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('لا توجد عهد مسلمة لك حالياً',
                              style: TextStyle(color: Colors.grey, fontSize: 16)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadData,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          final custodyItem = item.custodyItem;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.blue.shade100,
                                child: Text(
                                  custodyItem?.category?.icon ?? '📦',
                                  style: const TextStyle(fontSize: 20),
                                ),
                              ),
                              title: Text(
                                custodyItem?.name ?? 'عهدة',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('كود: ${custodyItem?.code ?? '-'}'),
                                  if (custodyItem?.serialNumber != null)
                                    Text('S/N: ${custodyItem!.serialNumber}'),
                                  Text('الحالة: ${_getConditionLabel(item.conditionOnAssign)}'),
                                  Text(
                                    'تاريخ التسليم: ${item.assignedAt.day}/${item.assignedAt.month}/${item.assignedAt.year}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(item.status).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _getStatusLabel(item.status),
                                  style: TextStyle(
                                    color: _getStatusColor(item.status),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              onTap: () => _showItemDetails(item),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  void _showItemDetails(CustodyAssignmentModel assignment) {
    final item = assignment.custodyItem;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                item?.name ?? 'تفاصيل العهدة',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              if (item?.qrCode != null)
                Center(
                  child: Image.network(item!.qrCode!, height: 150, width: 150),
                ),
              const SizedBox(height: 20),
              _buildDetailRow('الكود', item?.code ?? '-'),
              _buildDetailRow('الفئة', item?.category?.name ?? '-'),
              _buildDetailRow('الرقم التسلسلي', item?.serialNumber ?? '-'),
              _buildDetailRow('الموديل', item?.model ?? '-'),
              _buildDetailRow('العلامة التجارية', item?.brand ?? '-'),
              _buildDetailRow('الحالة', _getConditionLabel(assignment.conditionOnAssign)),
              _buildDetailRow('تاريخ التسليم', 
                '${assignment.assignedAt.day}/${assignment.assignedAt.month}/${assignment.assignedAt.year}'),
              if (assignment.expectedReturn != null)
                _buildDetailRow('تاريخ الإرجاع المتوقع',
                  '${assignment.expectedReturn!.day}/${assignment.expectedReturn!.month}/${assignment.expectedReturn!.year}'),
              if (assignment.notes != null)
                _buildDetailRow('ملاحظات', assignment.notes!),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.pushNamed(context, '/custody/return', arguments: assignment);
                      },
                      icon: const Icon(Icons.assignment_return),
                      label: const Text('طلب إرجاع'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.pushNamed(context, '/custody/transfer', arguments: assignment);
                      },
                      icon: const Icon(Icons.compare_arrows),
                      label: const Text('طلب تحويل'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                    ),
                  ),
                ],
              ),
              if (assignment.employeeSignature == null) ...[
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/custody/sign', arguments: assignment);
                  },
                  icon: const Icon(Icons.draw),
                  label: const Text('توقيع الاستلام'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}

// Provider for the data source - should be properly set up with Riverpod
final custodyDataSourceProvider = Provider<CustodyRemoteDataSource>((ref) {
  throw UnimplementedError('Must be overridden in the main app');
});
