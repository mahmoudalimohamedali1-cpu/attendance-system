import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../bloc/letters_bloc.dart';

class CreateLetterRequestPage extends StatefulWidget {
  const CreateLetterRequestPage({super.key});

  @override
  State<CreateLetterRequestPage> createState() => _CreateLetterRequestPageState();
}

class _CreateLetterRequestPageState extends State<CreateLetterRequestPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedType;
  final _notesController = TextEditingController();
  final List<File> _attachments = [];
  bool _isSubmitting = false;
  bool _isUploadingFiles = false;

  final _letterTypes = [
    {'value': 'SALARY_DEFINITION', 'label': 'خطاب تعريف راتب'},
    {'value': 'SERVICE_CONFIRMATION', 'label': 'خطاب تأكيد خدمة'},
    {'value': 'SALARY_ADJUSTMENT', 'label': 'خطاب تعديل راتب'},
    {'value': 'PROMOTION', 'label': 'خطاب ترقية'},
    {'value': 'TRANSFER_ASSIGNMENT', 'label': 'خطاب نقل / تكليف'},
    {'value': 'RESIGNATION', 'label': 'خطاب استقالة (معتمد من الشركة)'},
    {'value': 'TERMINATION', 'label': 'خطاب إنهاء خدمة'},
    {'value': 'CLEARANCE', 'label': 'خطاب إخلاء طرف'},
    {'value': 'EXPERIENCE', 'label': 'خطاب خبرة'},
    {'value': 'SALARY_DEFINITION_DIRECTED', 'label': 'خطاب تعريف راتب (موجّه لجهة محددة)'},
    {'value': 'NOC', 'label': 'خطاب عدم ممانعة'},
    {'value': 'DELEGATION', 'label': 'خطاب تفويض'},
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickFromCamera() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.camera);
      if (image != null) {
        setState(() {
          _attachments.add(File(image.path));
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('فشل التقاط الصورة: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        setState(() {
          _attachments.add(File(image.path));
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('فشل اختيار الصورة: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _pickFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _attachments.add(File(result.files.single.path!));
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('فشل اختيار الملف: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
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
    );
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
    });
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_selectedType == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('يرجى اختيار نوع الخطاب'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      setState(() {
        _isSubmitting = true;
        _isUploadingFiles = _attachments.isNotEmpty;
      });

      final notesText = _notesController.text.trim();

      final requestData = <String, dynamic>{
        'type': _selectedType,
      };

      if (notesText.isNotEmpty) {
        requestData['notes'] = notesText;
      }

      final attachmentPaths = _attachments.map((f) => f.path).toList();

      debugPrint('📤 Letter request data: $requestData');
      debugPrint('📎 Attachments: ${attachmentPaths.length}');
      debugPrint('🚀 Submitting letter request...');

      context.read<LettersBloc>().add(CreateLetterWithAttachmentsEvent(
        requestData,
        attachmentPaths,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<LettersBloc, LettersState>(
      listener: (context, state) {
        if (state is LetterCreatedSuccess) {
          setState(() {
            _isSubmitting = false;
            _isUploadingFiles = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم إرسال الطلب بنجاح - في انتظار الموافقة'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.pop();
        } else if (state is LettersError) {
          setState(() {
            _isSubmitting = false;
            _isUploadingFiles = false;
          });
          debugPrint('❌ Error state received: ${state.message}');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل إرسال الطلب: ${state.message}'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('طلب خطاب'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // نوع الخطاب
              Text(
                'نوع الخطاب',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedType,
                decoration: InputDecoration(
                  labelText: 'اختر نوع الخطاب',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: Icon(Icons.description_outlined, color: Colors.grey[400]),
                ),
                items: _letterTypes.map((type) {
                  return DropdownMenuItem<String>(
                    value: type['value'],
                    child: Text(type['label']!),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedType = value;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'يرجى اختيار نوع الخطاب';
                  }
                  return null;
                },
                isExpanded: true,
                menuMaxHeight: 300,
              ),
              const SizedBox(height: 24),

              // الملاحظات
              TextFormField(
                controller: _notesController,
                decoration: InputDecoration(
                  labelText: 'الملاحظات',
                  hintText: 'أدخل الملاحظات هنا...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  suffixIcon: Icon(Icons.note_outlined, color: Colors.grey[400]),
                ),
                maxLines: 4,
                maxLength: 200,
                validator: (value) {
                  if (value != null && value.length > 200) {
                    return 'الملاحظات يجب ألا تتجاوز 200 حرف';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // المرفقات
              Card(
                margin: EdgeInsets.zero,
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'المرفقات (اختياري)',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      if (_attachments.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _attachments.asMap().entries.map((entry) {
                            final index = entry.key;
                            final file = entry.value;
                            return Chip(
                              avatar: Icon(
                                file.path.toLowerCase().endsWith('.pdf')
                                    ? Icons.picture_as_pdf
                                    : Icons.image,
                              ),
                              label: Text(
                                file.path.split('/').last,
                                style: const TextStyle(fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              onDeleted: () => _removeAttachment(index),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _attachments.length < 5 ? _showAttachmentOptions : null,
                        icon: const Icon(Icons.attach_file),
                        label: const Text('إرفاق ملف'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[50],
                          foregroundColor: Colors.blue[700],
                          elevation: 0,
                        ),
                      ),
                      if (_attachments.length >= 5)
                        const Padding(
                          padding: EdgeInsets.only(top: 8.0),
                          child: Text(
                            'الحد الأقصى 5 مرفقات',
                            style: TextStyle(color: AppTheme.warningColor, fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // زر الإرسال
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          const SizedBox(width: 10),
                          Text(_isUploadingFiles ? 'جاري رفع المرفقات...' : 'جاري الإرسال...'),
                        ],
                      )
                    : const Text(
                        'تطبيق',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

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
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 32, color: AppTheme.primaryColor),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

