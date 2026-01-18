import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/di/injection.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/profile_bloc.dart';
import '../bloc/profile_event.dart';
import '../bloc/profile_state.dart';

/// Profile edit page with photo upload functionality
class ProfileEditPage extends StatefulWidget {
  const ProfileEditPage({super.key});

  @override
  State<ProfileEditPage> createState() => _ProfileEditPageState();
}

class _ProfileEditPageState extends State<ProfileEditPage> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  File? _selectedImage;
  bool _isSubmitting = false;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      final user = authState.user;
      _firstNameController.text = user.firstName;
      _lastNameController.text = user.lastName;
      _phoneController.text = user.phone ?? '';
      _emailController.text = user.email;
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onFieldChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 800,
      maxHeight: 800,
    );

    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
        _hasChanges = true;
      });
    }
  }

  void _showImagePickerOptions() {
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
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'تغيير الصورة الشخصية',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ImagePickerOption(
                    icon: Icons.camera_alt,
                    label: 'الكاميرا',
                    onTap: () {
                      Navigator.pop(context);
                      _pickImage(ImageSource.camera);
                    },
                  ),
                  _ImagePickerOption(
                    icon: Icons.photo_library,
                    label: 'المعرض',
                    onTap: () {
                      Navigator.pop(context);
                      _pickImage(ImageSource.gallery);
                    },
                  ),
                  if (_selectedImage != null)
                    _ImagePickerOption(
                      icon: Icons.delete_outline,
                      label: 'إزالة',
                      color: AppTheme.errorColor,
                      onTap: () {
                        Navigator.pop(context);
                        _removeImage();
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

  void _removeImage() {
    setState(() {
      _selectedImage = null;
      _hasChanges = true;
    });
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final profileBloc = getIt<ProfileBloc>();

      // Upload avatar if selected
      if (_selectedImage != null) {
        profileBloc.add(UpdateAvatarEvent(imagePath: _selectedImage!.path));
      }

      // Update profile data
      profileBloc.add(UpdateProfileEvent(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
      ));
    } catch (e) {
      _showError('حدث خطأ أثناء حفظ التغييرات');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<ProfileBloc>(),
      child: BlocListener<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdateSuccess || state is AvatarUpdateSuccess) {
            setState(() => _isSubmitting = false);
            _showSuccess('تم حفظ التغييرات بنجاح');
            context.pop(true);
          } else if (state is ProfileError) {
            setState(() => _isSubmitting = false);
            _showError(state.message);
          }
        },
        child: Scaffold(
          appBar: AppBar(
            title: const Text('تعديل الملف الشخصي'),
            centerTitle: true,
            actions: [
              if (_hasChanges)
                TextButton(
                  onPressed: _isSubmitting ? null : _saveChanges,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'حفظ',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
            ],
          ),
          body: BlocBuilder<AuthBloc, AuthState>(
            builder: (context, authState) {
              if (authState is! AuthAuthenticated) {
                return const Center(child: CircularProgressIndicator());
              }

              final user = authState.user;

              return SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      // Profile Photo Section
                      _buildPhotoSection(user),
                      const SizedBox(height: 32),

                      // Personal Info Card
                      _buildPersonalInfoCard(),
                      const SizedBox(height: 16),

                      // Contact Info Card
                      _buildContactInfoCard(),
                      const SizedBox(height: 24),

                      // Save Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: (_hasChanges && !_isSubmitting)
                              ? _saveChanges
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _isSubmitting
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text(
                                  'حفظ التغييرات',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSection(dynamic user) {
    return Column(
      children: [
        GestureDetector(
          onTap: _showImagePickerOptions,
          child: Stack(
            children: [
              // Avatar Container
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: _selectedImage != null
                      ? Image.file(
                          _selectedImage!,
                          fit: BoxFit.cover,
                          width: 120,
                          height: 120,
                        )
                      : user.avatar != null && user.avatar.isNotEmpty
                          ? Image.network(
                              user.avatar,
                              fit: BoxFit.cover,
                              width: 120,
                              height: 120,
                              errorBuilder: (context, error, stackTrace) =>
                                  _buildInitialsAvatar(user),
                            )
                          : _buildInitialsAvatar(user),
                ),
              ),
              // Camera Icon Overlay
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.camera_alt,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'اضغط لتغيير الصورة',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildInitialsAvatar(dynamic user) {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Center(
        child: Text(
          user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : '?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 48,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildPersonalInfoCard() {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.person,
                    color: AppTheme.primaryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'المعلومات الشخصية',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // First Name
            TextFormField(
              controller: _firstNameController,
              decoration: InputDecoration(
                labelText: 'الاسم الأول',
                prefixIcon: const Icon(Icons.person_outline),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (_) => _onFieldChanged(),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'الاسم الأول مطلوب';
                }
                if (value.trim().length < 2) {
                  return 'الاسم الأول يجب أن يكون حرفين على الأقل';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Last Name
            TextFormField(
              controller: _lastNameController,
              decoration: InputDecoration(
                labelText: 'اسم العائلة',
                prefixIcon: const Icon(Icons.person_outline),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (_) => _onFieldChanged(),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'اسم العائلة مطلوب';
                }
                if (value.trim().length < 2) {
                  return 'اسم العائلة يجب أن يكون حرفين على الأقل';
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactInfoCard() {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.contact_phone,
                    color: AppTheme.secondaryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'معلومات الاتصال',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Phone
            TextFormField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'رقم الهاتف',
                prefixIcon: const Icon(Icons.phone),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                hintText: '05xxxxxxxx',
              ),
              keyboardType: TextInputType.phone,
              onChanged: (_) => _onFieldChanged(),
              validator: (value) {
                if (value != null && value.trim().isNotEmpty) {
                  if (value.trim().length < 10) {
                    return 'رقم الهاتف غير صحيح';
                  }
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Email (Read-only)
            TextFormField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'البريد الإلكتروني',
                prefixIcon: const Icon(Icons.email),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              enabled: false,
            ),
            const SizedBox(height: 8),
            Text(
              'لتغيير البريد الإلكتروني، تواصل مع الإدارة',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Image picker option widget
class _ImagePickerOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _ImagePickerOption({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppTheme.primaryColor;

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
                color: effectiveColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: effectiveColor, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: effectiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
