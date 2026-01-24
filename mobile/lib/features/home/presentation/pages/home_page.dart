import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../attendance/presentation/bloc/attendance_bloc.dart';
import '../../../notifications/presentation/bloc/notifications_bloc.dart';
import '../widgets/check_in_out_card.dart';
import '../widgets/quick_stats_card.dart';
import '../widgets/today_status_card.dart';
import '../widgets/letter_request_card.dart';
import '../widgets/announcements_widget.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    _loadData();
    _setupNotificationListeners();
  }

  void _setupNotificationListeners() {
    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('📬 Foreground notification: ${message.notification?.title}');
      
      // Refresh notifications when a new one arrives
      context.read<NotificationsBloc>().add(GetNotificationsEvent());
      
      // Check for task deep link
      final taskId = message.data['taskId'];
      
      // Show a snackbar or update UI
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message.notification?.title ?? 'إشعار جديد'),
            action: SnackBarAction(
              label: 'عرض',
              onPressed: () {
                // Navigate to task if taskId exists, otherwise to notifications
                if (taskId != null && taskId.isNotEmpty) {
                  context.push('/my-tasks/$taskId');
                } else {
                  context.go('/notifications');
                }
              },
            ),
          ),
        );
      }
    });

    // Listen for background messages (when app is opened from notification)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('📬 Background notification opened: ${message.notification?.title}');
      
      // Check for task deep link
      final taskId = message.data['taskId'];
      
      if (mounted) {
        // Navigate to task if taskId exists, otherwise to notifications
        if (taskId != null && taskId.isNotEmpty) {
          context.push('/my-tasks/$taskId');
        } else {
          context.go('/notifications');
        }
      }
    });
  }

  void _loadData() {
    context.read<AttendanceBloc>().add(GetTodayAttendanceEvent());
    context.read<AttendanceBloc>().add(GetMonthlyStatsEvent(
      year: DateTime.now().year,
      month: DateTime.now().month,
    ));
    context.read<NotificationsBloc>().add(GetNotificationsEvent());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [const Color(0xFF1A1A2E), const Color(0xFF16213E)]
                : [const Color(0xFFF8FAFF), const Color(0xFFE8F4FD)],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              _loadData();
            },
            color: AppTheme.primaryColor,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    // Modern Header with User Info
                    _buildModernHeader(context, isDark),
                    const SizedBox(height: 24),
                    // Date & Time Banner
                    _buildDateTimeBanner(isDark),
                    const SizedBox(height: 20),
                    // Status Cards
                    const TodayStatusCard(),
                    const SizedBox(height: 16),
                    const CheckInOutCard(),
                    const SizedBox(height: 20),
                    // Stats Section
                    _buildSectionTitle('📊 إحصائيات الشهر', isDark),
                    const SizedBox(height: 12),
                    const QuickStatsCard(),
                    const SizedBox(height: 20),
                    // Announcements Section
                    const AnnouncementsWidget(),
                    const SizedBox(height: 20),
                    // Recent Letters
                    const LetterRequestCard(),
                    const SizedBox(height: 20),
                    // Quick Actions Section
                    _buildSectionTitle('⚡ إجراءات سريعة', isDark),
                    const SizedBox(height: 12),
                    const _QuickActionsCard(),
                    const SizedBox(height: 100), // Space for bottom nav
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModernHeader(BuildContext context, bool isDark) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        String name = 'المستخدم';
        String jobTitle = '';

        if (state is AuthAuthenticated) {
          name = state.user.firstName;
          jobTitle = state.user.jobTitle ?? '';
        }

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF667eea), Color(0xFF764ba2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF667eea).withValues(alpha: 0.4),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  // Avatar
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          color: Color(0xFF667eea),
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Name and Job
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'مرحباً، $name 👋',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (jobTitle.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              jobTitle,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  // Notification Button
                  _buildNotificationButton(context),
                ],
              ),
              const SizedBox(height: 16),
              // Dashboard Label
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Dashboard • لوحة التحكم',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNotificationButton(BuildContext context) {
    return BlocBuilder<NotificationsBloc, NotificationsState>(
      builder: (context, notifState) {
        int unreadCount = 0;
        if (notifState is NotificationsLoaded) {
          unreadCount = notifState.unreadCount;
        }
        
        return GestureDetector(
          onTap: () => context.go('/notifications'),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text(unreadCount > 9 ? '9+' : unreadCount.toString()),
              backgroundColor: Colors.red,
              child: const Icon(
                Icons.notifications_outlined,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDateTimeBanner(bool isDark) {
    final now = DateTime.now();
    final dateFormat = DateFormat('EEEE، d MMMM yyyy', 'ar');
    final timeFormat = DateFormat('hh:mm a', 'ar');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.calendar_today_rounded,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                dateFormat.format(now),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppTheme.textPrimaryLight,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              timeFormat.format(now),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: isDark ? Colors.white : AppTheme.textPrimaryLight,
        ),
      ),
    );
  }
}

class _QuickActionsCard extends StatelessWidget {
  const _QuickActionsCard();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        // تحديد صلاحيات المستخدم
        bool isManager = false;
        bool isAdmin = false;
        
        if (authState is AuthAuthenticated) {
          isAdmin = authState.user.role == 'ADMIN';
          isManager = authState.user.role == 'MANAGER' || isAdmin;
        }
        
        return Column(
          children: [
            // ========== الطلبات ==========
            _CategoryCard(
              title: 'الطلبات',
              icon: Icons.assignment,
              color: Colors.blue,
              children: [
                _QuickActionButton(
                  icon: Icons.beach_access,
                  label: 'إجازة',
                  color: Colors.blue,
                  onTap: () => context.push('/leaves/new'),
                ),
                _QuickActionButton(
                  icon: Icons.description,
                  label: 'خطاب',
                  color: Colors.green,
                  onTap: () => context.push('/letters/new'),
                ),
                _QuickActionButton(
                  icon: Icons.account_balance_wallet,
                  label: 'سلفة',
                  color: Colors.orange,
                  onTap: () => context.push('/advances/new'),
                ),
                _QuickActionButton(
                  icon: Icons.trending_up,
                  label: 'زيادة',
                  color: Colors.purple,
                  onTap: () => context.push('/raises/new'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // ========== العمل والأداء ==========
            _CategoryCard(
              title: 'العمل والأداء',
              icon: Icons.work,
              color: Colors.indigo,
              children: [
                _QuickActionButton(
                  icon: Icons.task_alt,
                  label: 'مهامي',
                  color: Colors.indigo,
                  onTap: () => context.go('/my-tasks'),
                ),
                _QuickActionButton(
                  icon: Icons.receipt_long,
                  label: 'رواتبي',
                  color: Colors.teal,
                  onTap: () => context.go('/my-payslips'),
                ),
                _QuickActionButton(
                  icon: Icons.forum,
                  label: 'التواصل',
                  color: Colors.pink,
                  onTap: () => context.go('/social-feed'),
                ),
                _QuickActionButton(
                  icon: Icons.flag,
                  label: 'أهدافي',
                  color: Colors.green,
                  onTap: () => context.go('/my-goals'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // ========== الإدارة والأصول ==========
            // ✅ يظهر للجميع لكن الأزرار تختلف حسب الصلاحية
            _CategoryCard(
              title: isManager ? 'الإدارة والأصول' : 'الأصول والجزاءات',
              icon: isManager ? Icons.admin_panel_settings : Icons.inventory_2,
              color: Colors.brown,
              children: [
                // ✅ العهد - يظهر للجميع
                _QuickActionButton(
                  icon: Icons.inventory_2,
                  label: 'العهد',
                  color: Colors.brown,
                  onTap: () => context.go('/my-custody'),
                ),
                
                // ✅ الجزاءات - يظهر للجميع (المحتوى يختلف حسب الدور في صفحة الجزاءات)
                _QuickActionButton(
                  icon: Icons.gavel,
                  label: 'الجزاءات',
                  color: Colors.redAccent,
                  onTap: () => context.go('/disciplinary'),
                ),
                
                // ⛔ طلبات معلقة - للمدراء فقط
                if (isManager)
                  _QuickActionButton(
                    icon: Icons.pending_actions,
                    label: 'طلبات معلقة',
                    color: Colors.red,
                    onTap: () => context.go('/pending'),
                  ),
                
                // ⛔ تقرير شهري - للمدراء فقط
                if (isManager)
                  _QuickActionButton(
                    icon: Icons.bar_chart,
                    label: 'تقرير شهري',
                    color: Colors.teal,
                    onTap: () => context.go('/monthly-report'),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final List<_QuickActionButton> children;

  const _CategoryCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
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
                    color: color.withValues(alpha: 0.1),
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
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 4,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 0.85,
              children: children,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: isDark ? Colors.grey[800] : Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color.withValues(alpha: 0.2), color.withValues(alpha: 0.1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  color: isDark ? Colors.white : AppTheme.textPrimaryLight,
                  fontWeight: FontWeight.w500,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

