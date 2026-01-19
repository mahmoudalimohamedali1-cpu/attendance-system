import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/home/presentation/pages/main_layout.dart';
import '../../features/home/presentation/pages/pending_requests_page.dart';
import '../../features/attendance/presentation/pages/attendance_history_page.dart';
import '../../features/attendance/presentation/pages/monthly_stats_page.dart';
import '../../features/leaves/presentation/pages/leaves_page.dart';
import '../../features/leaves/presentation/pages/create_leave_request_page.dart';
import '../../features/leaves/presentation/pages/pending_leaves_page.dart';
import '../../features/leaves/presentation/pages/leave_details_page.dart';
import '../../features/letters/presentation/pages/create_letter_request_page.dart';
import '../../features/letters/presentation/pages/pending_letters_page.dart';
import '../../features/letters/presentation/pages/letter_details_page.dart';
import '../../features/letters/presentation/pages/letters_page.dart';
import '../../features/raises/presentation/pages/raises_page.dart';
import '../../features/raises/presentation/pages/create_raise_request_page.dart';
import '../../features/advances/presentation/pages/advances_page.dart';
import '../../features/advances/presentation/pages/create_advance_request_page.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/profile_edit_page.dart';
import '../../features/profile/presentation/pages/change_password_page.dart';
import '../../features/profile/presentation/pages/update_data_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/disciplinary/presentation/pages/disciplinary_list_page.dart';
import '../../features/disciplinary/presentation/pages/disciplinary_detail_page.dart';
import '../../features/tasks/presentation/pages/my_tasks_page.dart';
import '../../features/tasks/presentation/pages/task_details_page.dart';
import '../../features/custody/presentation/pages/my_custody_page.dart';
import '../../features/custody/presentation/pages/request_return_page.dart';
import '../../features/custody/presentation/pages/request_transfer_page.dart';
import '../../features/custody/presentation/pages/sign_custody_page.dart';
import '../../features/custody/data/datasources/custody_remote_datasource.dart';
import '../../features/performance/presentation/pages/performance_reviews_page.dart';
import '../../features/goals/presentation/pages/my_goals_page.dart';
import '../../features/recognition/presentation/pages/recognition_page.dart';
import '../../features/attendance/presentation/pages/monthly_report_page.dart';
import '../../features/requests/presentation/pages/my_requests_page.dart';

class AppRouter {
  static final _rootNavigatorKey = GlobalKey<NavigatorState>();
  static final _shellNavigatorKey = GlobalKey<NavigatorState>();

  static final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      try {
        final authBloc = context.read<AuthBloc>();
        final authState = authBloc.state;
        
        final isSplash = state.matchedLocation == '/splash';
        final isLoginRoute = state.matchedLocation == '/login' ||
            state.matchedLocation == '/forgot-password';

        // If still loading, stay on splash
        if (authState is AuthInitial || authState is AuthLoading) {
          if (!isSplash) {
            return '/splash';
          }
          return null;
        }

        final isLoggedIn = authState is AuthAuthenticated;

        // If on splash and auth check is done, redirect appropriately
        if (isSplash) {
          return isLoggedIn ? '/home' : '/login';
        }

        if (!isLoggedIn && !isLoginRoute) {
          return '/login';
        }

        if (isLoggedIn && isLoginRoute) {
          return '/home';
        }
      } catch (e) {
        // If there's an error reading auth state, go to login
        debugPrint('⚠️ Error in router redirect: $e');
        return '/login';
      }

      return null;
    },
    routes: [
      // Splash route - shows while checking auth
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const _SplashPage(),
      ),
      // Auth routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),

      // Main shell with bottom navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainLayout(child: child),
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            builder: (context, state) => const HomePage(),
          ),
          // Unified pending requests route
          GoRoute(
            path: '/pending',
            name: 'pending-requests',

            builder: (context, state) => const PendingRequestsPage(),
          ),
          GoRoute(
            path: '/attendance',
            name: 'attendance',
            builder: (context, state) => const AttendanceHistoryPage(),
            routes: [
              GoRoute(
                path: 'stats/:year/:month',
                name: 'monthly-stats',
                builder: (context, state) {
                  final year = int.parse(state.pathParameters['year']!);
                  final month = int.parse(state.pathParameters['month']!);
                  return MonthlyStatsPage(year: year, month: month);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/leaves',
            name: 'leaves',
            builder: (context, state) => const LeavesPage(),
            routes: [
              GoRoute(
                path: 'new',
                name: 'new-leave',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CreateLeaveRequestPage(),
              ),
              GoRoute(
                path: 'pending',
                name: 'pending-leaves',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const PendingLeavesPage(),
              ),
              GoRoute(
                path: 'details/:id',
                name: 'leave-details',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return LeaveDetailsPage(leaveId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/letters',
            name: 'letters',
            builder: (context, state) => const LettersPage(),
            routes: [
              GoRoute(
                path: 'new',
                name: 'new-letter',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CreateLetterRequestPage(),
              ),
              GoRoute(
                path: 'pending',
                name: 'pending-letters',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const PendingLettersPage(),
              ),
              GoRoute(
                path: 'details/:id',
                name: 'letter-details',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return LetterDetailsPage(letterId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/raises',
            name: 'raises',
            builder: (context, state) => const RaisesPage(),
            routes: [
              GoRoute(
                path: 'new',
                name: 'new-raise',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CreateRaiseRequestPage(),
              ),
            ],
          ),
          GoRoute(
            path: '/advances',
            name: 'advances',
            builder: (context, state) => const AdvancesPage(),
            routes: [
              GoRoute(
                path: 'new',
                name: 'new-advance',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const CreateAdvanceRequestPage(),
              ),
            ],
          ),
          // Disciplinary routes
          GoRoute(
            path: '/disciplinary',
            name: 'disciplinary',
            builder: (context, state) => const DisciplinaryListPage(),
            routes: [
              GoRoute(
                path: 'details/:id',
                name: 'disciplinary-details',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return DisciplinaryDetailPage(caseId: id);
                },
              ),
            ],
          ),
          // My Tasks routes
          GoRoute(
            path: '/my-tasks',
            name: 'my-tasks',
            builder: (context, state) => const MyTasksPage(),
            routes: [
              GoRoute(
                path: ':id',
                name: 'task-details',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return TaskDetailsPage(taskId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/notifications',
            name: 'notifications',
            builder: (context, state) => const NotificationsPage(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfilePage(),
            routes: [
              GoRoute(
                path: 'edit',
                name: 'profile-edit',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const ProfileEditPage(),
              ),
              GoRoute(
                path: 'update-data',
                name: 'update-data',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const UpdateDataPage(),
              ),
              GoRoute(
                path: 'change-password',
                name: 'change-password',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const ChangePasswordPage(),
              ),
              GoRoute(
                path: 'settings',
                name: 'settings',
                parentNavigatorKey: _rootNavigatorKey,
                builder: (context, state) => const SettingsPage(),
              ),
            ],
          ),
          // Custody routes
          GoRoute(
            path: '/my-custody',
            name: 'my-custody',
            builder: (context, state) => const MyCustodyPage(),
          ),
          // Performance Reviews route
          GoRoute(
            path: '/performance-reviews',
            name: 'performance-reviews',
            builder: (context, state) => const PerformanceReviewsPage(),
          ),
          // Goals route
          GoRoute(
            path: '/my-goals',
            name: 'my-goals',
            builder: (context, state) => const MyGoalsPage(),
          ),
          // Recognition route
          GoRoute(
            path: '/recognition',
            name: 'recognition',
            builder: (context, state) => const RecognitionPage(),
          ),
          // Monthly Report route
          GoRoute(
            path: '/monthly-report',
            name: 'monthly-report',
            builder: (context, state) => const MonthlyReportPage(),
          ),
          // My Requests route (unified requests page)
          GoRoute(
            path: '/my-requests',
            name: 'my-requests',
            builder: (context, state) => const MyRequestsPage(),
          ),
        ],
      ),
      // Custody sub-routes (outside shell for full screen)
      GoRoute(
        path: '/custody/return',
        name: 'custody-return',
        builder: (context, state) {
          final assignment = state.extra as CustodyAssignmentModel;
          return RequestReturnPage(assignment: assignment);
        },
      ),
      GoRoute(
        path: '/custody/transfer',
        name: 'custody-transfer',
        builder: (context, state) {
          final assignment = state.extra as CustodyAssignmentModel;
          return RequestTransferPage(assignment: assignment);
        },
      ),
      GoRoute(
        path: '/custody/sign',
        name: 'custody-sign',
        builder: (context, state) {
          final assignment = state.extra as CustodyAssignmentModel;
          return SignCustodyPage(assignment: assignment);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'الصفحة غير موجودة',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(state.error?.message ?? ''),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/login'),
              child: const Text('تسجيل الدخول'),
            ),
          ],
        ),
      ),
    ),
  );
}

// صفحة التحميل الأولية
class _SplashPage extends StatefulWidget {
  const _SplashPage();

  @override
  State<_SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<_SplashPage> {
  @override
  void initState() {
    super.initState();
    // Listen to auth state changes
    _checkAuthAndNavigate();
  }

  void _checkAuthAndNavigate() {
    // Small delay to ensure context is ready
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        final authState = context.read<AuthBloc>().state;
        if (authState is AuthAuthenticated) {
          context.go('/home');
        } else if (authState is AuthUnauthenticated || authState is AuthError) {
          context.go('/login');
        }
        // If still AuthInitial or AuthLoading, the BlocListener will handle it
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          context.go('/home');
        } else if (state is AuthUnauthenticated || state is AuthError) {
          context.go('/login');
        }
      },
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF6C5CE7),
                Color(0xFF5B4CC4),
                Color(0xFF4834D4),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo with animation
              Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(36),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.access_time_rounded,
                  size: 70,
                  color: Color(0xFF6C5CE7),
                ),
              ),
              const SizedBox(height: 40),
              const Text(
                'نظام الحضور',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Attendance System',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 60),
              SizedBox(
                width: 40,
                height: 40,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white.withValues(alpha: 0.9)),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'جاري التحميل...',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

