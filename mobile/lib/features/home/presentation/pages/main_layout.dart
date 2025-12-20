import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/services/permissions_service.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class MainLayout extends StatelessWidget {
  final Widget child;

  const MainLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const _BottomNavBar(),
    );
  }
}

/// Menu item definition with permission requirements
class _NavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String labelKey;
  final String route;
  final List<String>? requiredPermissions; // Any of these grants access
  final bool adminOnly;

  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.labelKey,
    required this.route,
    this.requiredPermissions,
    this.adminOnly = false,
  });
}

class _BottomNavBar extends StatelessWidget {
  const _BottomNavBar();

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        // Get user role and permissions
        String userRole = 'EMPLOYEE';
        if (authState is AuthAuthenticated) {
          userRole = authState.user.role;
        }

        // Get permissions service
        final permissionsService = getPermissionsService();
        final isAdmin = userRole == 'ADMIN';
        final isManager = userRole == 'MANAGER';

        // Define all navigation items
        final allItems = <_NavItem>[
          const _NavItem(
            icon: Icons.home_outlined,
            selectedIcon: Icons.home,
            labelKey: 'home',
            route: '/home',
          ),
          const _NavItem(
            icon: Icons.calendar_today_outlined,
            selectedIcon: Icons.calendar_today,
            labelKey: 'attendance',
            route: '/attendance',
            // requiredPermissions: ['ATTENDANCE_VIEW', 'ATTENDANCE_EDIT'],
          ),
          const _NavItem(
            icon: Icons.assignment_outlined,
            selectedIcon: Icons.assignment,
            labelKey: 'الطلبات',
            route: '/leaves',
            // Show if has any leaves or letters permission, or is manager/admin
          ),
          const _NavItem(
            icon: Icons.notifications_outlined,
            selectedIcon: Icons.notifications,
            labelKey: 'notifications',
            route: '/notifications',
          ),
          const _NavItem(
            icon: Icons.person_outline,
            selectedIcon: Icons.person,
            labelKey: 'profile',
            route: '/profile',
          ),
        ];

        // Filter items based on permissions
        final visibleItems = allItems.where((item) {
          // Admin/Manager always sees everything
          if (isAdmin || isManager) return true;

          // Admin only items
          if (item.adminOnly) return isAdmin;

          // Permission based items
          if (item.requiredPermissions != null && item.requiredPermissions!.isNotEmpty) {
            return permissionsService.hasAnyPermission(item.requiredPermissions!);
          }

          // No restrictions - always visible
          return true;
        }).toList();

        // Get selected index based on current route
        int selectedIndex = 0;
        for (int i = 0; i < visibleItems.length; i++) {
          if (location.startsWith(visibleItems[i].route)) {
            selectedIndex = i;
            break;
          }
        }

        return Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: (index) {
              if (index < visibleItems.length) {
                context.go(visibleItems[index].route);
              }
            },
            destinations: visibleItems.map((item) {
              return NavigationDestination(
                icon: Icon(item.icon),
                selectedIcon: Icon(item.selectedIcon),
                label: item.labelKey == 'home' || item.labelKey == 'attendance' ||
                       item.labelKey == 'notifications' || item.labelKey == 'profile'
                    ? context.tr(item.labelKey)
                    : item.labelKey,
              );
            }).toList(),
          ),
        );
      },
    );
  }
}
