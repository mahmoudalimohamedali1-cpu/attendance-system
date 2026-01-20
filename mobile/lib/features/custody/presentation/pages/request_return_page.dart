import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../data/datasources/custody_remote_datasource.dart';
import '../../../../core/di/injection.dart';

class RequestReturnPage extends StatefulWidget {
  final CustodyAssignmentModel assignment;
  
  const RequestReturnPage({super.key, required this.assignment});

  @override
  State<RequestReturnPage> createState() => _RequestReturnPageState();
}

class _RequestReturnPageState extends State<RequestReturnPage> {
  final _formKey = GlobalKey<FormState>();
  String _condition = 'GOOD';
  String _reason = '';
  String _damageDescription = '';
  bool _loading = false;
  late CustodyRemoteDataSource _datasource;

  @override
  void initState() {
    super.initState();
    final dio = getIt<Dio>();
    _datasource = CustodyRemoteDataSource(dio);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() => _loading = true);
    try {
      await _datasource.requestReturn(
        assignmentId: widget.assignment.id,
        conditionOnReturn: _condition,
        returnReason: _reason.isNotEmpty ? _reason : null,
        damageDescription: _damageDescription.isNotEmpty ? _damageDescription : null,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إرسال طلب الإرجاع بنجاح'), backgroundColor: Colors.green),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل في الإرسال: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.assignment.custodyItem;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('🔄 طلب إرجاع عهدة'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Item Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item?.name ?? 'العهدة',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text('كود: ${item?.code ?? '-'}'),
                    if (item?.serialNumber != null) Text('S/N: ${item!.serialNumber}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Condition Dropdown
            const Text('حالة العهدة عند الإرجاع *', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: const [
                DropdownMenuItem(value: 'NEW', child: Text('جديدة')),
                DropdownMenuItem(value: 'EXCELLENT', child: Text('ممتازة')),
                DropdownMenuItem(value: 'GOOD', child: Text('جيدة')),
                DropdownMenuItem(value: 'FAIR', child: Text('مقبولة')),
                DropdownMenuItem(value: 'POOR', child: Text('سيئة')),
              ],
              onChanged: (v) => setState(() => _condition = v!),
            ),
            const SizedBox(height: 16),

            // Return Reason
            const Text('سبب الإرجاع', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'اختياري - مثال: انتهاء المهمة',
              ),
              onSaved: (v) => _reason = v ?? '',
            ),
            const SizedBox(height: 16),

            // Damage Description (if poor condition)
            if (_condition == 'POOR' || _condition == 'FAIR') ...[
              const Text('وصف التلف', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
              const SizedBox(height: 8),
              TextFormField(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'صف حالة التلف بالتفصيل',
                ),
                maxLines: 3,
                onSaved: (v) => _damageDescription = v ?? '',
                validator: (v) {
                  if ((_condition == 'POOR') && (v == null || v.isEmpty)) {
                    return 'يرجى وصف التلف';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.orange.shade700),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'ملاحظة: قد يتم خصم تكلفة الإصلاح من راتبك في حالة التلف',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                ),
                child: _loading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('إرسال طلب الإرجاع', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
