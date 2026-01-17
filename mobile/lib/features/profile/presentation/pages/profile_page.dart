import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../bloc/profile_bloc.dart';
import '../bloc/profile_event.dart';
import '../bloc/profile_state.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _skills = [];
  bool _isLoadingSkills = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadSkills();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSkills() async {
    setState(() => _isLoadingSkills = true);
    try {
      final apiClient = getIt<ApiClient>();
      final authState = context.read<AuthBloc>().state;
      if (authState is AuthAuthenticated) {
        final response = await apiClient.dio.get('/employee-profile/${authState.user.id}/skills');
        if (response.statusCode == 200 && response.data != null) {
          final data = response.data['data'];
          if (data is Map && data['skills'] != null) {
            setState(() {
              _skills = List<Map<String, dynamic>>.from(data['skills'] ?? []);
            });
          } else if (data is List) {
            setState(() {
              _skills = List<Map<String, dynamic>>.from(data);
            });
          }
        }
      }
    } catch (e) {
      // Skills loading failed, show empty state
    } finally {
      if (mounted) {
        setState(() => _isLoadingSkills = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<ProfileBloc>()
        ..add(const LoadDocumentsEvent())
        ..add(const LoadEmergencyContactsEvent()),
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('profile')),
          actions: [
            IconButton(
              onPressed: () => context.push('/profile/settings'),
              icon: const Icon(Icons.settings),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(48),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: AppTheme.primaryColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                labelColor: Colors.white,
                unselectedLabelColor: Colors.grey[600],
                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                tabs: const [
                  Tab(text: 'نظرة عامة'),
                  Tab(text: 'المستندات'),
                  Tab(text: 'المهارات'),
                  Tab(text: 'الطوارئ'),
                ],
              ),
            ),
          ),
        ),
        body: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is! AuthAuthenticated) {
              return const Center(child: CircularProgressIndicator());
            }

            final user = state.user;

            return TabBarView(
              controller: _tabController,
              children: [
                // Overview Tab
                _OverviewTab(user: user),
                // Documents Tab
                _DocumentsTab(userId: user.id),
                // Skills Tab
                _SkillsTab(
                  skills: _skills,
                  isLoading: _isLoadingSkills,
                  onRefresh: _loadSkills,
                ),
                // Emergency Contacts Tab
                _EmergencyContactsTab(userId: user.id),
              ],
            );
          },
        ),
      ),
    );
  }
}

// Overview Tab - shows profile info and stats
class _OverviewTab extends StatelessWidget {
  final dynamic user;

  const _OverviewTab({required this.user});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Profile Header
          _ProfileHeader(user: user),
          const SizedBox(height: 24),

          // Personal Info Card
          _InfoCard(
            title: context.tr('personal_info'),
            icon: Icons.person,
            color: AppTheme.primaryColor,
            items: [
              _InfoItem(
                icon: Icons.person,
                label: context.tr('full_name'),
                value: user.fullName,
              ),
              _InfoItem(
                icon: Icons.email,
                label: context.tr('email'),
                value: user.email,
              ),
              _InfoItem(
                icon: Icons.phone,
                label: context.tr('phone'),
                value: user.phone ?? 'غير محدد',
              ),
              _InfoItem(
                icon: Icons.badge,
                label: context.tr('employee_code'),
                value: user.employeeCode ?? 'غير محدد',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Work Info Card
          _InfoCard(
            title: 'معلومات العمل',
            icon: Icons.work,
            color: AppTheme.secondaryColor,
            items: [
              _InfoItem(
                icon: Icons.work,
                label: context.tr('job_title'),
                value: user.jobTitle ?? 'غير محدد',
              ),
              _InfoItem(
                icon: Icons.business,
                label: context.tr('department'),
                value: user.department?.name ?? 'غير محدد',
              ),
              _InfoItem(
                icon: Icons.location_city,
                label: context.tr('branch'),
                value: user.branch?.name ?? 'غير محدد',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Leave Balance Card
          _LeaveBalanceCard(user: user),
          const SizedBox(height: 24),

          // Actions
          _ActionTile(
            icon: Icons.person_outline,
            title: 'تعديل الملف الشخصي',
            onTap: () => context.push('/profile/edit'),
          ),
          _ActionTile(
            icon: Icons.edit,
            title: 'تحديث بيانات الحضور',
            onTap: () => context.push('/profile/update-data'),
          ),
          _ActionTile(
            icon: Icons.lock,
            title: context.tr('change_password'),
            onTap: () => context.push('/profile/change-password'),
          ),
          _ActionTile(
            icon: Icons.logout,
            title: context.tr('logout'),
            color: AppTheme.errorColor,
            onTap: () => _showLogoutDialog(context),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تسجيل الخروج'),
        content: const Text('هل أنت متأكد من تسجيل الخروج؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(LogoutEvent());
              context.go('/login');
            },
            child: Text(
              'تسجيل الخروج',
              style: TextStyle(color: AppTheme.errorColor),
            ),
          ),
        ],
      ),
    );
  }
}

// Documents Tab - shows documents with expiry badges
class _DocumentsTab extends StatelessWidget {
  final String userId;

  const _DocumentsTab({required this.userId});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProfileBloc, ProfileState>(
      builder: (context, state) {
        if (state is ProfileLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        List<ProfileDocument> documents = [];
        if (state is ProfileLoaded) {
          documents = state.documents;
        }

        if (documents.isEmpty) {
          return _EmptyState(
            icon: Icons.folder_open,
            title: 'لا توجد مستندات',
            subtitle: 'لم يتم إضافة أي مستندات بعد',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            context.read<ProfileBloc>().add(const LoadDocumentsEvent());
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: documents.length,
            itemBuilder: (context, index) {
              final doc = documents[index];
              return _DocumentCard(document: doc);
            },
          ),
        );
      },
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final ProfileDocument document;

  const _DocumentCard({required this.document});

  String _getDocumentTypeLabel(String type) {
    switch (type) {
      case 'ID_CARD':
        return 'بطاقة الهوية';
      case 'PASSPORT':
        return 'جواز السفر';
      case 'CERTIFICATE':
        return 'شهادة';
      case 'QUALIFICATION':
        return 'مؤهل علمي';
      case 'BANK_LETTER':
        return 'خطاب بنكي';
      case 'MEDICAL':
        return 'تقرير طبي';
      case 'CONTRACT':
        return 'عقد';
      case 'OTHER':
      default:
        return 'أخرى';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('d MMM yyyy', 'ar');

    Color statusColor = AppTheme.successColor;
    String? statusText;
    IconData statusIcon = Icons.check_circle;

    if (document.isExpired) {
      statusColor = AppTheme.errorColor;
      statusText = 'منتهي';
      statusIcon = Icons.error;
    } else if (document.isExpiringSoon) {
      statusColor = AppTheme.warningColor;
      statusText = 'قريب الانتهاء';
      statusIcon = Icons.warning;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.description,
                color: AppTheme.primaryColor,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    document.title.isNotEmpty ? document.title : _getDocumentTypeLabel(document.documentType),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getDocumentTypeLabel(document.documentType),
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  if (document.expiryDate != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.event, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          'ينتهي: ${dateFormat.format(document.expiryDate!)}',
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (statusText != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 14, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      statusText,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w500,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// Skills Tab - shows skills with proficiency levels
class _SkillsTab extends StatelessWidget {
  final List<Map<String, dynamic>> skills;
  final bool isLoading;
  final VoidCallback onRefresh;

  const _SkillsTab({
    required this.skills,
    required this.isLoading,
    required this.onRefresh,
  });

  String _getProficiencyLabel(String? level) {
    switch (level) {
      case 'BEGINNER':
        return 'مبتدئ';
      case 'INTERMEDIATE':
        return 'متوسط';
      case 'ADVANCED':
        return 'متقدم';
      case 'EXPERT':
        return 'خبير';
      default:
        return 'غير محدد';
    }
  }

  Color _getProficiencyColor(String? level) {
    switch (level) {
      case 'BEGINNER':
        return Colors.orange;
      case 'INTERMEDIATE':
        return Colors.blue;
      case 'ADVANCED':
        return Colors.green;
      case 'EXPERT':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  int _getProficiencyProgress(String? level) {
    switch (level) {
      case 'BEGINNER':
        return 25;
      case 'INTERMEDIATE':
        return 50;
      case 'ADVANCED':
        return 75;
      case 'EXPERT':
        return 100;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (skills.isEmpty) {
      return _EmptyState(
        icon: Icons.psychology,
        title: 'لا توجد مهارات',
        subtitle: 'لم يتم إضافة أي مهارات بعد',
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: skills.length,
        itemBuilder: (context, index) {
          final skill = skills[index];
          final proficiency = skill['proficiencyLevel'] as String?;
          final progress = _getProficiencyProgress(proficiency);
          final color = _getProficiencyColor(proficiency);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
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
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.star,
                          color: color,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              skill['skillNameAr'] ?? skill['skillName'] ?? '',
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (skill['category'] != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                skill['category'],
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getProficiencyLabel(proficiency),
                          style: TextStyle(
                            color: color,
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (skill['isVerified'] == true) ...[
                        const SizedBox(width: 8),
                        Icon(
                          Icons.verified,
                          color: AppTheme.successColor,
                          size: 20,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                      minHeight: 6,
                    ),
                  ),
                  if (skill['yearsExperience'] != null && skill['yearsExperience'] > 0) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${skill['yearsExperience']} سنوات خبرة',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// Emergency Contacts Tab
class _EmergencyContactsTab extends StatelessWidget {
  final String userId;

  const _EmergencyContactsTab({required this.userId});

  String _getRelationshipLabel(String? relationship) {
    switch (relationship) {
      case 'SPOUSE':
        return 'الزوج/الزوجة';
      case 'PARENT':
        return 'الوالد/الوالدة';
      case 'SIBLING':
        return 'الأخ/الأخت';
      case 'CHILD':
        return 'الابن/الابنة';
      case 'RELATIVE':
        return 'قريب';
      case 'FRIEND':
        return 'صديق';
      case 'NEIGHBOR':
        return 'جار';
      case 'COLLEAGUE':
        return 'زميل عمل';
      case 'OTHER':
      default:
        return 'أخرى';
    }
  }

  IconData _getRelationshipIcon(String? relationship) {
    switch (relationship) {
      case 'SPOUSE':
        return Icons.favorite;
      case 'PARENT':
        return Icons.family_restroom;
      case 'SIBLING':
        return Icons.people;
      case 'CHILD':
        return Icons.child_care;
      case 'RELATIVE':
        return Icons.groups;
      case 'FRIEND':
        return Icons.person;
      case 'NEIGHBOR':
        return Icons.home;
      case 'COLLEAGUE':
        return Icons.work;
      default:
        return Icons.contact_phone;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProfileBloc, ProfileState>(
      builder: (context, state) {
        if (state is ProfileLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        List<EmergencyContact> contacts = [];
        if (state is ProfileLoaded) {
          contacts = state.emergencyContacts;
        }

        return RefreshIndicator(
          onRefresh: () async {
            context.read<ProfileBloc>().add(const LoadEmergencyContactsEvent());
          },
          child: contacts.isEmpty
              ? SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: SizedBox(
                    height: MediaQuery.of(context).size.height * 0.6,
                    child: _EmptyState(
                      icon: Icons.contact_emergency,
                      title: 'لا توجد جهات اتصال للطوارئ',
                      subtitle: 'أضف جهات اتصال للطوارئ للتواصل في حالات الطوارئ',
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: contacts.length,
                  itemBuilder: (context, index) {
                    final contact = contacts[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: AppTheme.errorColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Icon(
                                  _getRelationshipIcon(contact.relationship),
                                  color: AppTheme.errorColor,
                                  size: 24,
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        contact.name,
                                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.grey[200],
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          '${index + 1}',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _getRelationshipLabel(contact.relationship),
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(Icons.phone, size: 14, color: AppTheme.primaryColor),
                                      const SizedBox(width: 4),
                                      Text(
                                        contact.phone,
                                        style: TextStyle(
                                          color: AppTheme.primaryColor,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        );
      },
    );
  }
}

// Shared Widgets

class _ProfileHeader extends StatelessWidget {
  final dynamic user;

  const _ProfileHeader({required this.user});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: () => context.push('/profile/edit'),
          child: Stack(
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: user.avatar != null && user.avatar.isNotEmpty
                      ? Image.network(
                          user.avatar,
                          fit: BoxFit.cover,
                          width: 100,
                          height: 100,
                          errorBuilder: (context, error, stackTrace) =>
                              _buildInitialsAvatar(),
                        )
                      : _buildInitialsAvatar(),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.camera_alt,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          user.fullName,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          user.jobTitle ?? '',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildInitialsAvatar() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Center(
        child: Text(
          user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : '?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 40,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final List<_InfoItem> items;

  const _InfoCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
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
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            ...items,
          ],
        ),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LeaveBalanceCard extends StatelessWidget {
  final dynamic user;

  const _LeaveBalanceCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final remaining = user.remainingLeaveDays ?? 0;
    final used = user.usedLeaveDays ?? 0;
    final total = user.annualLeaveDays ?? 21;

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.beach_access,
                    color: AppTheme.primaryColor,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'رصيد الإجازات',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                      Text(
                        '$remaining يوم',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: total > 0 ? (total - remaining) / total : 0,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                minHeight: 10,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'مستخدم: $used يوم',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                Text(
                  'إجمالي: $total يوم',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color? color;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.title,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(
          title,
          style: TextStyle(color: color),
        ),
        trailing: Icon(Icons.arrow_forward_ios, size: 16, color: color),
        onTap: onTap,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                icon,
                size: 64,
                color: Colors.grey[400],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
