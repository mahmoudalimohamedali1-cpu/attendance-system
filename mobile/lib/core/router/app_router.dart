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
import '../../features/profile/presentation/pages/change_password_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/disciplinary/presentation/pages/disciplinary_list_page.dart';
import '../../features/disciplinary/presentation/pages/disciplinary_detail_page.dart';

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
        print('⚠️ Error in router redirect: $e');
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
            parentNavigatorKey: _rootNavigatorKey,
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
        ],
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
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF1565C0),
                Color(0xFF0D47A1),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.access_time_rounded,
                  size: 60,
                  color: Color(0xFF1565C0),
                ),
              ),
              const SizedBox(height: 30),
              const Text(
                'نظام الحضور',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 50),
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
              const SizedBox(height: 20),
              const Text(
                'جاري التحميل...',
                style: TextStyle(
                  fontSize: 16,
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

