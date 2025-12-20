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
      print('📬 Foreground notification: ${message.notification?.title}');
      
      // Refresh notifications when a new one arrives
      context.read<NotificationsBloc>().add(GetNotificationsEvent());
      
      // Show a snackbar or update UI
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message.notification?.title ?? 'إشعار جديد'),
            action: SnackBarAction(
              label: 'عرض',
              onPressed: () {
                context.go('/notifications');
              },
            ),
          ),
        );
      }
    });

    // Listen for background messages (when app is opened from notification)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📬 Background notification opened: ${message.notification?.title}');
      // Navigate to notifications page
      if (mounted) {
        context.go('/notifications');
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
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            _loadData();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 24),
                _buildDateTimeCard(),
                const SizedBox(height: 20),
                const TodayStatusCard(),
                const SizedBox(height: 20),
                const CheckInOutCard(),
                const SizedBox(height: 20),
                const QuickStatsCard(),
                const SizedBox(height: 20),
                const LetterRequestCard(),
                const SizedBox(height: 20),
                _QuickActionsCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        String name = 'المستخدم';
        String jobTitle = '';

        if (state is AuthAuthenticated) {
          name = state.user.firstName;
          jobTitle = state.user.jobTitle ?? '';
        }

        return Row(
          children: [
            // Avatar
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            
            // Name and Job Title
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${context.tr('welcome')}، $name 👋',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (jobTitle.isNotEmpty)
                    Text(
                      jobTitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                ],
              ),
            ),
            
            // Notifications Icon
            BlocBuilder<NotificationsBloc, NotificationsState>(
              builder: (context, notifState) {
                int unreadCount = 0;
                if (notifState is NotificationsLoaded) {
                  unreadCount = notifState.unreadCount;
                }
                
                return IconButton(
                  onPressed: () => context.go('/notifications'),
                  icon: unreadCount > 0
                      ? Badge(
                          label: Text(unreadCount > 9 ? '9+' : unreadCount.toString()),
                          child: const Icon(Icons.notifications_outlined),
                        )
                      : const Icon(Icons.notifications_outlined),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildDateTimeCard() {
    final now = DateTime.now();
    final dateFormat = DateFormat('EEEE، d MMMM yyyy', 'ar');
    final timeFormat = DateFormat('hh:mm a', 'ar');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withOpacity(0.8),
            AppTheme.primaryDark,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today,
                      color: Colors.white70,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      dateFormat.format(now),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                StreamBuilder(
                  stream: Stream.periodic(const Duration(seconds: 1)),
                  builder: (context, snapshot) {
                    return Text(
                      timeFormat.format(DateTime.now()),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.access_time_rounded,
              color: Colors.white,
              size: 40,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionsCard extends StatelessWidget {
  const _QuickActionsCard();

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
                Icon(Icons.dashboard, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  'إجراءات سريعة',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _QuickActionButton(
                    icon: Icons.assignment,
                    label: 'طلب إجازة',
                    color: Colors.blue,
                    onTap: () => context.push('/leaves/new'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionButton(
                    icon: Icons.description,
                    label: 'طلب خطاب',
                    color: Colors.green,
                    onTap: () => context.push('/letters/new'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _QuickActionButton(
                    icon: Icons.account_balance_wallet,
                    label: 'طلب سلفة',
                    color: Colors.orange,
                    onTap: () => context.push('/advances/new'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickActionButton(
                    icon: Icons.trending_up,
                    label: 'طلب زيادة',
                    color: Colors.purple,
                    onTap: () => context.push('/raises/new'),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

