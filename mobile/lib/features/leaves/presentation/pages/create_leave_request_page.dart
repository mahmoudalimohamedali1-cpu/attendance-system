import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../bloc/leaves_bloc.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class CreateLeaveRequestPage extends StatefulWidget {
  const CreateLeaveRequestPage({super.key});

  @override
  State<CreateLeaveRequestPage> createState() => _CreateLeaveRequestPageState();
}

class _CreateLeaveRequestPageState extends State<CreateLeaveRequestPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();
  final List<File> _attachments = [];
  bool _isSubmitting = false;
  final bool _isUploadingFiles = false;

  // حساب عدد الأيام المطلوبة
  int get _requestedDays {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays + 1;
  }

  final _leaveTypes = [
    {'value': 'ANNUAL', 'label': 'إجازة سنوية'},
    {'value': 'SICK', 'label': 'إجازة مرضية'},
    {'value': 'PERSONAL', 'label': 'إجازة شخصية'},
    {'value': 'EMERGENCY', 'label': 'إجازة طارئة'},
    {'value': 'EARLY_LEAVE', 'label': 'خروج مبكر'},
    {'value': 'OTHER', 'label': 'أخرى'},
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(bool isStartDate) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('ar'),
    );

    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = picked;
          }
        } else {
          _endDate = picked;
        }
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

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_startDate == null || _endDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('يرجى اختيار تاريخ البداية والنهاية'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      setState(() => _isSubmitting = true);

      // تحويل التواريخ إلى صيغة YYYY-MM-DD فقط (بدون وقت)
      final dateFormat = DateFormat('yyyy-MM-dd');
      final reasonText = _reasonController.text.trim();
      
      // إعداد البيانات
      final requestData = <String, dynamic>{
        'type': _selectedType,
        'startDate': dateFormat.format(_startDate!),
        'endDate': dateFormat.format(_endDate!),
      };
      
      // إضافة reason فقط إذا كان موجوداً
      if (reasonText.isNotEmpty) {
        requestData['reason'] = reasonText;
      }
      
      // إضافة المرفقات إذا وجدت
      final attachmentPaths = _attachments.map((f) => f.path).toList();
      
      debugPrint('📤 Leave request data: $requestData');
      debugPrint('📎 Attachments: ${attachmentPaths.length}');
      
      context.read<LeavesBloc>().add(CreateLeaveWithAttachmentsEvent(
        requestData,
        attachmentPaths,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<LeavesBloc, LeavesState>(
      listener: (context, state) {
        debugPrint('🔔 LeavesBloc state: $state');
        if (state is LeaveCreatedSuccess) {
          debugPrint('✅ Leave request successful!');
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم إرسال الطلب بنجاح - في انتظار الموافقة'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.pop();
        } else if (state is LeavesError) {
          debugPrint('❌ Leave request error: ${state.message}');
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        } else if (state is LeavesLoading) {
          debugPrint('⏳ Loading...');
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('new_leave_request')),
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Leave Balance Card
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  if (state is AuthAuthenticated) {
                    final user = state.user;
                    final remaining = user.remainingLeaveDays ?? 0;
                    final annual = user.annualLeaveDays ?? 0;
                    
                    return Card(
                      margin: const EdgeInsets.only(bottom: 24),
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      color: AppTheme.primaryColor.withValues(alpha: 0.05),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'رصيد الإجازات المتبقي',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    '$remaining يوم',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (annual > 0) ...[
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('الإجمالي السنوي: $annual يوم', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                  Text('المستخدم: ${(user.usedLeaveDays) ?? 0} يوم', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),

              // Leave Type
            DropdownButtonFormField<String>(
              initialValue: _selectedType,
              decoration: InputDecoration(
                labelText: context.tr('leave_type'),
                prefixIcon: const Icon(Icons.category),
              ),
              items: _leaveTypes.map((type) {
                return DropdownMenuItem(
                  value: type['value'],
                  child: Text(type['label']!),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedType = value);
              },
              validator: (value) {
                if (value == null) return 'يرجى اختيار نوع الإجازة';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Date Range
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(true),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('start_date'),
                        prefixIcon: const Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _startDate != null
                            ? DateFormat('d/M/yyyy').format(_startDate!)
                            : 'اختر التاريخ',
                        style: TextStyle(
                          color: _startDate != null ? null : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(false),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('end_date'),
                        prefixIcon: const Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _endDate != null
                            ? DateFormat('d/M/yyyy').format(_endDate!)
                            : 'اختر التاريخ',
                        style: TextStyle(
                          color: _endDate != null ? null : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            
            // عرض عدد الأيام المحسوبة وتأثيرها على الرصيد
            if (_startDate != null && _endDate != null)
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, authState) {
                  final remaining = authState is AuthAuthenticated 
                      ? (authState.user.remainingLeaveDays ?? 0) 
                      : 0;
                  final afterRequest = remaining - _requestedDays;
                  final isInsufficient = afterRequest < 0;
                  
                  return Container(
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isInsufficient 
                          ? Colors.red.withOpacity(0.1)
                          : Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isInsufficient ? Colors.red : Colors.green,
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.calendar_today,
                                  color: isInsufficient ? Colors.red : Colors.green,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'الأيام المطلوبة:',
                                  style: TextStyle(fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: isInsufficient ? Colors.red : Colors.green,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                '$_requestedDays يوم',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('الرصيد بعد الطلب:'),
                            Text(
                              '$afterRequest يوم',
                              style: TextStyle(
                                color: isInsufficient ? Colors.red : Colors.green,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                        if (isInsufficient) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(Icons.warning, color: Colors.red, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'رصيد الإجازات غير كافي! سيتم خصم ${afterRequest.abs()} يوم من راتبك',
                                  style: const TextStyle(color: Colors.red, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 20),

            // Reason
            TextFormField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: context.tr('reason'),
                prefixIcon: const Icon(Icons.description),
                alignLabelWithHint: true,
              ),
              maxLines: 4,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'يرجى كتابة سبب الطلب';
                }
                if (value.length < 10) {
                  return 'يرجى كتابة سبب واضح (10 أحرف على الأقل)';
                }
                return null;
              },
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
                            'يمكنك إرفاق صور أو ملفات (تقارير طبية، وثائق...)',
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
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('إرسال الطلب'),
              ),
            ),
          ],
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
