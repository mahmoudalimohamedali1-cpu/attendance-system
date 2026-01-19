import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../data/datasources/custody_remote_datasource.dart';
import 'my_custody_page.dart';

class RequestTransferPage extends ConsumerStatefulWidget {
  final CustodyAssignmentModel assignment;
  
  const RequestTransferPage({super.key, required this.assignment});

  @override
  ConsumerState<RequestTransferPage> createState() => _RequestTransferPageState();
}

class _RequestTransferPageState extends ConsumerState<RequestTransferPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedEmployeeId;
  String _reason = '';
  String _notes = '';
  bool _loading = false;
  List<Map<String, dynamic>> _employees = [];

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: 'https://72.61.239.170/api/v1',
        connectTimeout: const Duration(seconds: 30),
      ));
      final response = await dio.get('/users', queryParameters: {'status': 'ACTIVE'});
      setState(() {
        _employees = (response.data as List).map((e) => {
          'id': e['id'],
          'name': '${e['firstName'] ?? ''} ${e['lastName'] ?? ''}'.trim(),
        }).toList();
      });
    } catch (e) {
      debugPrint('Error loading employees: $e');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedEmployeeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى اختيار الموظف'), backgroundColor: Colors.red),
      );
      return;
    }
    _formKey.currentState!.save();

    setState(() => _loading = true);
    try {
      final datasource = ref.read(custodyDataSourceProvider);
      await datasource.requestTransfer(
        custodyItemId: widget.assignment.custodyItemId,
        toEmployeeId: _selectedEmployeeId!,
        reason: _reason.isNotEmpty ? _reason : null,
        notes: _notes.isNotEmpty ? _notes : null,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إرسال طلب التحويل بنجاح'), backgroundColor: Colors.green),
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
        title: const Text('🔀 طلب تحويل عهدة'),
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

            // Employee Selection Dropdown
            const Text('الموظف المستلم *', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _selectedEmployeeId,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'اختر الموظف...',
                prefixIcon: Icon(Icons.person),
              ),
              items: _employees.map((emp) => DropdownMenuItem(
                value: emp['id'] as String,
                child: Text(emp['name'] as String),
              )).toList(),
              onChanged: (v) => setState(() => _selectedEmployeeId = v),
              validator: (v) => v == null ? 'يرجى اختيار الموظف' : null,
            ),
            const SizedBox(height: 16),

            // Reason
            const Text('سبب التحويل', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'مثال: انتقال لقسم آخر، تغيير المسؤوليات',
              ),
              onSaved: (v) => _reason = v ?? '',
            ),
            const SizedBox(height: 16),

            // Notes
            const Text('ملاحظات إضافية', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'أي ملاحظات أخرى...',
              ),
              maxLines: 3,
              onSaved: (v) => _notes = v ?? '',
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'سيتم إرسال إشعار للموظف المستلم للموافقة على التحويل',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                ),
                child: _loading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('إرسال طلب التحويل', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
