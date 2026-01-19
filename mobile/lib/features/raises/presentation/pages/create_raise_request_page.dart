// lib/features/raises/presentation/pages/create_raise_request_page.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/entities/raise_request.dart';
import '../../data/models/raise_request_model.dart';
import '../bloc/raises_bloc.dart';

class CreateRaiseRequestPage extends StatefulWidget {
  const CreateRaiseRequestPage({super.key});

  @override
  State<CreateRaiseRequestPage> createState() => _CreateRaiseRequestPageState();
}

class _CreateRaiseRequestPageState extends State<CreateRaiseRequestPage> {
  final _formKey = GlobalKey<FormState>();
  RaiseType _selectedType = RaiseType.salaryIncrease;
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedMonth = DateTime.now();
  final List<File> _attachments = [];
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _raiseTypes = [
    {'type': RaiseType.salaryIncrease, 'label': 'زيادة راتب', 'icon': Icons.trending_up},
    {'type': RaiseType.annualLeaveBonus, 'label': 'بدل إجازة سنوية', 'icon': Icons.beach_access},
    {'type': RaiseType.businessTrip, 'label': 'رحلة عمل', 'icon': Icons.flight},
    {'type': RaiseType.bonus, 'label': 'مكافأة', 'icon': Icons.star},
    {'type': RaiseType.allowance, 'label': 'بدل', 'icon': Icons.account_balance_wallet},
    {'type': RaiseType.other, 'label': 'أخرى', 'icon': Icons.more_horiz},
  ];

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _selectMonth() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedMonth,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('ar'),
    );
    if (picked != null) {
      setState(() {
        _selectedMonth = picked;
      });
    }
  }

  // اختيار صورة من الكاميرا
  Future<void> _pickFromCamera() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (image != null) {
      setState(() {
        _attachments.add(File(image.path));
      });
    }
  }

  // اختيار صورة من المعرض
  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (image != null) {
      setState(() {
        _attachments.add(File(image.path));
      });
    }
  }

  // اختيار ملف
  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      allowMultiple: true,
    );
    if (result != null) {
      setState(() {
        for (final file in result.files) {
          if (file.path != null) {
            _attachments.add(File(file.path!));
          }
        }
      });
    }
  }

  // عرض خيارات اختيار المرفق
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
              const Text(
                'إضافة مرفق',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _AttachmentOption(
                    icon: Icons.camera_alt,
                    label: 'الكاميرا',
                    onTap: () {
                      Navigator.pop(context);
                      _pickFromCamera();
                    },
                  ),
                  _AttachmentOption(
                    icon: Icons.photo_library,
                    label: 'المعرض',
                    onTap: () {
                      Navigator.pop(context);
                      _pickFromGallery();
                    },
                  ),
                  _AttachmentOption(
                    icon: Icons.attach_file,
                    label: 'ملف',
                    onTap: () {
                      Navigator.pop(context);
                      _pickFile();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // حذف مرفق
  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
    });
  }

  void _submitRequest() {
    if (_formKey.currentState!.validate()) {
      setState(() => _isSubmitting = true);
      
      final dto = CreateRaiseRequestDto(
        type: _selectedType,
        amount: double.parse(_amountController.text),
        effectiveMonth: _selectedMonth,
        notes: _notesController.text.isEmpty ? null : _notesController.text,
        attachmentPaths: _attachments.map((f) => f.path).toList(),
      );
      context.read<RaisesBloc>().add(CreateRaiseEvent(dto));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('طلب زيادة'),
        centerTitle: true,
      ),
      body: BlocListener<RaisesBloc, RaisesState>(
        listener: (context, state) {
          if (state is RaiseCreated) {
            setState(() => _isSubmitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تم إرسال الطلب بنجاح'),
                backgroundColor: Colors.green,
              ),
            );
            context.pop();
          } else if (state is RaiseCreateError) {
            setState(() => _isSubmitting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Purpose Selector
                const Text(
                  'الغرض',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _raiseTypes.map((item) {
                    final isSelected = _selectedType == item['type'];
                    return ChoiceChip(
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            item['icon'] as IconData,
                            size: 18,
                            color: isSelected ? Colors.white : Colors.grey.shade700,
                          ),
                          const SizedBox(width: 4),
                          Text(item['label'] as String),
                        ],
                      ),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedType = item['type'] as RaiseType);
                        }
                      },
                      selectedColor: Theme.of(context).primaryColor,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.grey.shade700,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),

                // Amount
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  decoration: InputDecoration(
                    labelText: 'المبلغ',
                    prefixIcon: const Icon(Icons.monetization_on_outlined),
                    suffixText: 'ر.س',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'المبلغ مطلوب';
                    }
                    if (double.tryParse(value) == null || double.parse(value) <= 0) {
                      return 'أدخل مبلغاً صحيحاً';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Month Selector
                InkWell(
                  onTap: _selectMonth,
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'الزيادة لشهر',
                      prefixIcon: const Icon(Icons.calendar_month),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      DateFormat('MMMM yyyy', 'ar').format(_selectedMonth),
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Notes
                TextFormField(
                  controller: _notesController,
                  maxLines: 4,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: 'الملاحظات',
                    alignLabelWithHint: true,
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 60),
                      child: Icon(Icons.notes),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    helperText: 'اختياري - حد أقصى 200 حرف',
                  ),
                ),
                const SizedBox(height: 16),

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
                                const Icon(Icons.attach_file, color: AppTheme.primaryColor),
                                const SizedBox(width: 8),
                                const Text(
                                  'المرفقات',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '(اختياري)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                ),
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
                              child: Text(
                                'يمكنك إرفاق صور أو ملفات داعمة للطلب',
                                style: TextStyle(color: Colors.grey[500], fontSize: 13),
                              ),
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
                              final isImage = fileName.toLowerCase().endsWith('.jpg') ||
                                  fileName.toLowerCase().endsWith('.jpeg') ||
                                  fileName.toLowerCase().endsWith('.png');
                              
                              return ListTile(
                                leading: isImage
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.file(
                                          file,
                                          width: 50,
                                          height: 50,
                                          fit: BoxFit.cover,
                                        ),
                                      )
                                    : Container(
                                        width: 50,
                                        height: 50,
                                        decoration: BoxDecoration(
                                          color: Colors.blue.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(Icons.description, color: Colors.blue),
                                      ),
                                title: Text(
                                  fileName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                trailing: IconButton(
                                  icon: const Icon(Icons.close, color: Colors.red),
                                  onPressed: () => _removeAttachment(index),
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submitRequest,
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'تقديم الطلب',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Widget لخيارات المرفقات
class _AttachmentOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AttachmentOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
}
