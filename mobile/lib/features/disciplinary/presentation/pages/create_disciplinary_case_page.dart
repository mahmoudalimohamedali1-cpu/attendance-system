import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/disciplinary_remote_datasource.dart';
import '../cubit/disciplinary_cubit.dart';
import '../cubit/disciplinary_state.dart';

class CreateDisciplinaryCasePage extends StatelessWidget {
  const CreateDisciplinaryCasePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DisciplinaryCubit(
        DisciplinaryRemoteDataSourceImpl(GetIt.I<ApiClient>()),
      )..loadUsers(),
      child: const _CreateCaseView(),
    );
  }
}

class _CreateCaseView extends StatefulWidget {
  const _CreateCaseView();

  @override
  State<_CreateCaseView> createState() => _CreateCaseViewState();
}

class _CreateCaseViewState extends State<_CreateCaseView> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedEmployeeId;
  String _violationType = 'ATTENDANCE';
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _witnessesController = TextEditingController();
  DateTime _incidentDate = DateTime.now();
  final List<File> _attachments = [];
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _witnessesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('فتح طلب تحقيق جديد'),
        centerTitle: true,
        backgroundColor: const Color(0xFF1a237e),
        foregroundColor: Colors.white,
      ),
      body: BlocConsumer<DisciplinaryCubit, DisciplinaryState>(
        listener: (context, state) {
          if (state is DisciplinaryActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
            Navigator.pop(context, true);
          }
          if (state is DisciplinaryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // --- الموظف المعني ---
                _buildSectionHeader('الموظف المعني *', Icons.person),
                const SizedBox(height: 8),
                if (state is DisciplinaryUsersLoaded)
                  DropdownButtonFormField<String>(
                    value: _selectedEmployeeId,
                    decoration: _inputDecoration('اختر الموظف'),
                    items: state.users.map((u) {
                      final name = '${u['firstName']} ${u['lastName'] ?? ''}';
                      final code = u['employeeCode'] ?? '';
                      return DropdownMenuItem(
                        value: u['id'].toString(),
                        child: Text('$name ${code.isNotEmpty ? "($code)" : ""}'),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedEmployeeId = val),
                    validator: (val) => val == null ? 'يرجى اختيار موظف' : null,
                  )
                else
                  const Center(child: LinearProgressIndicator()),

                const SizedBox(height: 24),

                // --- عنوان القضية / نوع المخالفة ---
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionHeader('عنوان القضية *', Icons.title),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _titleController,
                            decoration: _inputDecoration('عنوان القضية / نوع المخالفة'),
                            validator: (val) => val == null || val.isEmpty ? 'مطلوب' : null,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // --- تاريخ ومكان الواقعة (صف واحد) ---
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionHeader('تاريخ الواقعة *', Icons.calendar_today),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _pickDate,
                            child: InputDecorator(
                              decoration: _inputDecoration(''),
                              child: Text(
                                '${_incidentDate.year}/${_incidentDate.month}/${_incidentDate.day}',
                                style: const TextStyle(fontSize: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionHeader('مكان الواقعة *', Icons.location_on),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _locationController,
                            decoration: _inputDecoration('الفرع / القسم / الموقع'),
                            validator: (val) => val == null || val.isEmpty ? 'مطلوب' : null,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // --- نوع المخالفة ---
                _buildSectionHeader('تصنيف المخالفة', Icons.category),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _violationType,
                  decoration: _inputDecoration(''),
                  items: const [
                    DropdownMenuItem(value: 'ATTENDANCE', child: Text('تأخير / غياب / انصراف مبكر')),
                    DropdownMenuItem(value: 'BEHAVIOR', child: Text('سلوك غير لائق')),
                    DropdownMenuItem(value: 'PERFORMANCE', child: Text('تقصير في العمل')),
                    DropdownMenuItem(value: 'POLICY_VIOLATION', child: Text('مخالفة سياسة الشركة')),
                    DropdownMenuItem(value: 'SAFETY', child: Text('مخالفة السلامة')),
                    DropdownMenuItem(value: 'HARASSMENT', child: Text('تحرش / إساءة')),
                    DropdownMenuItem(value: 'THEFT', child: Text('سرقة / اختلاس')),
                    DropdownMenuItem(value: 'OTHER', child: Text('أخرى')),
                  ],
                  onChanged: (val) => setState(() => _violationType = val!),
                ),

                const SizedBox(height: 24),

                // --- وصف الواقعة ---
                _buildSectionHeader('وصف الواقعة *', Icons.description),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 5,
                  maxLength: 5000,
                  decoration: _inputDecoration('اكتب تفاصيل الواقعة بوضوح...').copyWith(
                    alignLabelWithHint: true,
                    counterText: '${_descriptionController.text.length}/5000 حرف',
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'يرجى إدخال التفاصيل' : null,
                  onChanged: (_) => setState(() {}),
                ),

                const SizedBox(height: 24),

                // --- أطراف المشكلة / الشهود ---
                _buildSectionHeader('أطراف المشكلة / الشهود', Icons.group),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _witnessesController,
                  maxLines: 2,
                  decoration: _inputDecoration('أسماء الشهود أو الأطراف الأخرى (اختياري)'),
                ),

                const SizedBox(height: 24),

                // --- المرفقات ---
                _buildSectionHeader('المرفقات (اختياري)', Icons.attach_file),
                const SizedBox(height: 8),
                _buildAttachmentSection(),

                const SizedBox(height: 24),

                // --- ملاحظات مهمة ---
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.amber.shade800, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'ملاحظات مهمة:',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildInfoBullet('سيتم إرسال الطلب لقسم الموارد البشرية للمراجعة'),
                      _buildInfoBullet('يمكن إضافة مرفقات إضافية بعد إنشاء الطلب'),
                      _buildInfoBullet('الموظف سيتم إبلاغه بالواقعة بعد موافقة HR'),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // --- أزرار الإجراء ---
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('إلغاء'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: state is DisciplinaryLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1a237e),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: state is DisciplinaryLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('إرسال الطلب', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade700),
        const SizedBox(width: 6),
        Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
      ],
    );
  }

  Widget _buildInfoBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
          Expanded(child: Text(text, style: TextStyle(fontSize: 13, color: Colors.grey.shade700))),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _incidentDate,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _incidentDate = picked);
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final data = {
        'employeeId': _selectedEmployeeId!,
        'violationType': _violationType,
        'title': _titleController.text,
        'description': _descriptionController.text,
        'incidentDate': _incidentDate.toIso8601String(),
        'incidentLocation': _locationController.text,
        'involvedParties': {'witnesses': _witnessesController.text},
      };
      
      // تحويل الملفات لقائمة paths
      final attachmentPaths = _attachments.map((f) => f.path).toList();
      
      context.read<DisciplinaryCubit>().createCase(
        data,
        attachmentPaths: attachmentPaths.isNotEmpty ? attachmentPaths : null,
      );
    }
  }

  // ========== منطقة المرفقات ==========
  Widget _buildAttachmentSection() {
    return Column(
      children: [
        // منطقة الإضافة
        InkWell(
          onTap: _showAttachmentOptions,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 32),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid, width: 2.0..toDouble()),
              borderRadius: BorderRadius.circular(12),
              color: Colors.grey.shade50,
            ),
            child: Column(
              children: [
                Icon(Icons.cloud_upload_outlined, size: 48, color: Colors.grey.shade500),
                const SizedBox(height: 8),
                Text(
                  'اضغط لإضافة صور أو ملفات',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                const SizedBox(height: 4),
                Text(
                  '(صور، PDF، Word، Excel - حد أقصى 10MB)',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
        ),

        // عرض الملفات المرفقة
        if (_attachments.isNotEmpty) ...
          [
            const SizedBox(height: 12),
            ..._attachments.asMap().entries.map((entry) {
              final index = entry.key;
              final file = entry.value;
              final fileName = file.path.split('/').last;
              final fileSize = file.lengthSync();
              final isImage = fileName.toLowerCase().endsWith('.jpg') ||
                              fileName.toLowerCase().endsWith('.jpeg') ||
                              fileName.toLowerCase().endsWith('.png');

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    if (isImage)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.file(file, width: 50, height: 50, fit: BoxFit.cover),
                      )
                    else
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: Colors.blue.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(Icons.insert_drive_file, color: Colors.blue.shade700),
                      ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fileName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          Text(
                            '${(fileSize / 1024).toStringAsFixed(1)} KB',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () => setState(() => _attachments.removeAt(index)),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
      ],
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text('إضافة مرفق', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.camera_alt, color: Colors.blue.shade700),
                ),
                title: const Text('التقاط صورة'),
                subtitle: const Text('استخدم الكاميرا لالتقاط صورة'),
                onTap: () {
                  Navigator.pop(context);
                  _pickFromCamera();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.green.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.image, color: Colors.green.shade700),
                ),
                title: const Text('اختيار من المعرض'),
                subtitle: const Text('اختر صورة من معرض الصور'),
                onTap: () {
                  Navigator.pop(context);
                  _pickFromGallery();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.folder_open, color: Colors.orange.shade700),
                ),
                title: const Text('اختيار ملف'),
                subtitle: const Text('PDF، Word، Excel، وغيرها'),
                onTap: () {
                  Navigator.pop(context);
                  _pickFile();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFromCamera() async {
    final XFile? image = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (image != null) {
      final file = File(image.path);
      if (file.lengthSync() > 10 * 1024 * 1024) {
        _showError('حجم الصورة أكبر من 10MB');
        return;
      }
      setState(() => _attachments.add(file));
    }
  }

  Future<void> _pickFromGallery() async {
    final XFile? image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (image != null) {
      final file = File(image.path);
      if (file.lengthSync() > 10 * 1024 * 1024) {
        _showError('حجم الصورة أكبر من 10MB');
        return;
      }
      setState(() => _attachments.add(file));
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
      allowMultiple: true,
    );
    if (result != null && result.files.isNotEmpty) {
      for (final platformFile in result.files) {
        if (platformFile.path != null) {
          final file = File(platformFile.path!);
          if (file.lengthSync() > 10 * 1024 * 1024) {
            _showError('الملف ${platformFile.name} أكبر من 10MB');
            continue;
          }
          setState(() => _attachments.add(file));
        }
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }
}
