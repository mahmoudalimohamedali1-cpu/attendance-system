import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';

class CreateAdvanceRequestPage extends StatefulWidget {
  const CreateAdvanceRequestPage({super.key});

  @override
  State<CreateAdvanceRequestPage> createState() => _CreateAdvanceRequestPageState();
}

class _CreateAdvanceRequestPageState extends State<CreateAdvanceRequestPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final _amountController = TextEditingController();
  final _periodController = TextEditingController();
  final _deductionController = TextEditingController();
  final _notesController = TextEditingController();
  final List<File> _attachments = [];
  bool _isSubmitting = false;

  final _advanceTypes = [
    {'value': 'BANK_TRANSFER', 'label': 'سلفة تحويل بنكي'},
    {'value': 'CASH', 'label': 'سلفه نقداً'},
  ];

  @override
  void dispose() {
    _amountController.dispose();
    _periodController.dispose();
    _deductionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _calculateDeduction() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    final period = int.tryParse(_periodController.text) ?? 0;
    if (amount > 0 && period > 0) {
      final deduction = (amount / period).ceil();
      _deductionController.text = deduction.toString();
    }
  }

  Future<void> _selectDate(bool isStartDate) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
      locale: const Locale('ar'),
    );

    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          _calculateEndDate();
        } else {
          _endDate = picked;
        }
      });
    }
  }

  void _calculateEndDate() {
    final period = int.tryParse(_periodController.text) ?? 0;
    if (_startDate != null && period > 0) {
      setState(() {
        _endDate = DateTime(_startDate!.year, _startDate!.month + period, _startDate!.day);
      });
    }
  }

  Future<void> _pickFromCamera() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera, imageQuality: 80);
    if (image != null) {
      setState(() => _attachments.add(File(image.path)));
    }
  }

  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (image != null) {
      setState(() => _attachments.add(File(image.path)));
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      allowMultiple: true,
    );
    if (result != null) {
      setState(() {
        for (final file in result.files) {
          if (file.path != null) _attachments.add(File(file.path!));
        }
      });
    }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('إضافة مرفق', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildAttachOption(Icons.camera_alt, 'الكاميرا', () { Navigator.pop(context); _pickFromCamera(); }),
                  _buildAttachOption(Icons.photo_library, 'المعرض', () { Navigator.pop(context); _pickFromGallery(); }),
                  _buildAttachOption(Icons.attach_file, 'ملف', () { Navigator.pop(context); _pickFile(); }),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttachOption(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: AppTheme.primaryColor, size: 28),
            ),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 14)),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى اختيار تاريخ بداية ونهاية السداد'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final apiClient = getIt<ApiClient>();
      final dateFormat = DateFormat('yyyy-MM-dd');

      final data = {
        'type': _selectedType,
        'amount': double.parse(_amountController.text),
        'startDate': dateFormat.format(_startDate!),
        'endDate': dateFormat.format(_endDate!),
        'periodMonths': int.parse(_periodController.text),
        'monthlyDeduction': double.parse(_deductionController.text),
        'notes': _notesController.text.isNotEmpty ? _notesController.text : null,
        'attachments': <Map<String, String>>[],
      };

      // Upload attachments if any (simplified - you can implement full upload)
      if (_attachments.isNotEmpty) {
        // For now, skip attachments upload - can be added later
        print('📎 Attachments count: ${_attachments.length} (upload not implemented yet)');
      }

      await apiClient.dio.post('/advances', data: data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إرسال طلب السلفة بنجاح'), backgroundColor: Colors.green),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل في إرسال الطلب: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('طلب سلفة')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // تنبيه
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline, color: Colors.amber.shade700),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'أي مبلغ غير مسدد من هذه السلفة يخصم من مستحقات الموظف النهائية',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

            // نوع السلفة
            DropdownButtonFormField<String>(
              value: _selectedType,
              decoration: const InputDecoration(
                labelText: 'الغرض',
                prefixIcon: Icon(Icons.category),
              ),
              items: _advanceTypes.map((type) {
                return DropdownMenuItem(value: type['value'], child: Text(type['label']!));
              }).toList(),
              onChanged: (value) => setState(() => _selectedType = value),
              validator: (value) => value == null ? 'يرجى اختيار نوع السلفة' : null,
            ),
            const SizedBox(height: 20),

            // المبلغ
            TextFormField(
              controller: _amountController,
              decoration: const InputDecoration(
                labelText: 'المبلغ',
                prefixIcon: Icon(Icons.monetization_on),
                suffixText: 'ريال',
              ),
              keyboardType: TextInputType.number,
              onChanged: (_) => _calculateDeduction(),
              validator: (value) {
                if (value == null || value.isEmpty) return 'يرجى إدخال المبلغ';
                if (double.tryParse(value) == null) return 'مبلغ غير صالح';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // الفترة بالشهور
            TextFormField(
              controller: _periodController,
              decoration: const InputDecoration(
                labelText: 'الفترة بالشهور',
                prefixIcon: Icon(Icons.date_range),
                suffixText: 'شهر',
              ),
              keyboardType: TextInputType.number,
              onChanged: (_) {
                _calculateDeduction();
                _calculateEndDate();
              },
              validator: (value) {
                if (value == null || value.isEmpty) return 'يرجى إدخال الفترة';
                if (int.tryParse(value) == null) return 'رقم غير صالح';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // تاريخ بداية ونهاية السداد
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(true),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'من تاريخ',
                        prefixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _startDate != null ? DateFormat('d/M/yyyy').format(_startDate!) : 'اختر التاريخ',
                        style: TextStyle(color: _startDate != null ? null : Colors.grey),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(false),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'إلى تاريخ',
                        prefixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _endDate != null ? DateFormat('d/M/yyyy').format(_endDate!) : 'اختر التاريخ',
                        style: TextStyle(color: _endDate != null ? null : Colors.grey),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // الاستقطاع الشهري
            TextFormField(
              controller: _deductionController,
              decoration: const InputDecoration(
                labelText: 'الاستقطاع الشهري',
                prefixIcon: Icon(Icons.remove_circle_outline),
                suffixText: 'ريال',
                helperText: 'يحسب تلقائياً أو عدّل يدوياً',
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.isEmpty) return 'يرجى إدخال الاستقطاع الشهري';
                if (double.tryParse(value) == null) return 'رقم غير صالح';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // الملاحظات
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'الملاحظات',
                prefixIcon: Icon(Icons.note),
                alignLabelWithHint: true,
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 24),

            // المرفقات
            Card(
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
                            Icon(Icons.attach_file, color: AppTheme.primaryColor),
                            const SizedBox(width: 8),
                            const Text('المرفقات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            const SizedBox(width: 8),
                            Text('(اختياري)', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                          ],
                        ),
                        TextButton.icon(
                          onPressed: _showAttachmentOptions,
                          icon: const Icon(Icons.add),
                          label: const Text('إضافة'),
                        ),
                      ],
                    ),
                    if (_attachments.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text('يمكنك إرفاق مستندات داعمة', style: TextStyle(color: Colors.grey[500], fontSize: 13)),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _attachments.length,
                        itemBuilder: (context, index) {
                          final file = _attachments[index];
                          final fileName = file.path.split('/').last;
                          return ListTile(
                            leading: const Icon(Icons.insert_drive_file),
                            title: Text(fileName, maxLines: 1, overflow: TextOverflow.ellipsis),
                            trailing: IconButton(
                              icon: const Icon(Icons.close, color: Colors.red),
                              onPressed: () => setState(() => _attachments.removeAt(index)),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // زر الإرسال
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('تقديم طلب السلفة'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
