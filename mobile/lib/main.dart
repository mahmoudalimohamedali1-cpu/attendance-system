import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/l10n/app_localizations.dart';
import 'core/services/notification_service.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/attendance/presentation/bloc/attendance_bloc.dart';
import 'features/notifications/presentation/bloc/notifications_bloc.dart';
import 'features/settings/presentation/bloc/settings_bloc.dart';
import 'features/leaves/presentation/bloc/leaves_bloc.dart';
import 'features/letters/presentation/bloc/letters_bloc.dart';
import 'features/raises/presentation/bloc/raises_bloc.dart';
import 'features/tasks/presentation/bloc/tasks_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase first
  try {
    await Firebase.initializeApp();
    debugPrint('✅ Firebase initialized');
  } catch (e) {
    debugPrint('⚠️ Firebase initialization failed: $e');
    // Continue without Firebase - app should still work
  }
  
  try {
    // Initialize Hive
    await Hive.initFlutter();
  } catch (e) {
    debugPrint('⚠️ Error initializing Hive: $e');
  }
  
  try {
    // Initialize dependency injection
    await configureDependencies();
  } catch (e) {
    debugPrint('❌ Error configuring dependencies: $e');
    // Continue anyway - some dependencies might still work
  }
  
  try {
    // Initialize Notification Service (non-blocking)
    final notificationService = getIt<NotificationService>();
    notificationService.initialize().catchError((error) {
      debugPrint('⚠️ Error initializing NotificationService: $error');
    });
  } catch (e) {
    debugPrint('⚠️ Error getting NotificationService: $e');
  }
  
  // Set preferred orientations
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (e) {
    debugPrint('⚠️ Error setting orientations: $e');
  }
  
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  
  runApp(const AttendanceApp());
}

class AttendanceApp extends StatelessWidget {
  const AttendanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    debugPrint('🚀 Building AttendanceApp...');
    
    // Create blocs with error handling
    AuthBloc? authBloc;
    AttendanceBloc? attendanceBloc;
    NotificationsBloc? notificationsBloc;
    SettingsBloc? settingsBloc;
    LeavesBloc? leavesBloc;
    LettersBloc? lettersBloc;
    RaisesBloc? raisesBloc;
    TasksBloc? tasksBloc;
    
    try {
      authBloc = getIt<AuthBloc>();
      debugPrint('✅ AuthBloc created');
    } catch (e) {
      debugPrint('❌ Error creating AuthBloc: $e');
    }
    
    try {
      attendanceBloc = getIt<AttendanceBloc>();
    } catch (e) {
      debugPrint('❌ Error creating AttendanceBloc: $e');
    }
    
    try {
      notificationsBloc = getIt<NotificationsBloc>();
    } catch (e) {
      debugPrint('❌ Error creating NotificationsBloc: $e');
    }
    
    try {
      settingsBloc = getIt<SettingsBloc>();
    } catch (e) {
      debugPrint('❌ Error creating SettingsBloc: $e');
    }
    
    try {
      leavesBloc = getIt<LeavesBloc>();
    } catch (e) {
      debugPrint('❌ Error creating LeavesBloc: $e');
    }
    
    try {
      lettersBloc = getIt<LettersBloc>();
    } catch (e) {
      debugPrint('❌ Error creating LettersBloc: $e');
    }
    
    try {
      raisesBloc = getIt<RaisesBloc>();
    } catch (e) {
      debugPrint('❌ Error creating RaisesBloc: $e');
    }
    
    try {
      tasksBloc = getIt<TasksBloc>();
    } catch (e) {
      debugPrint('❌ Error creating TasksBloc: $e');
    }
    
    // If critical blocs failed, show error screen
    if (authBloc == null || settingsBloc == null) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 64),
                const SizedBox(height: 20),
                const Text(
                  'فشل تشغيل التطبيق',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                Text(
                  authBloc == null ? 'خطأ في AuthBloc' : 'خطأ في SettingsBloc',
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      );
    }
    
    // Trigger initial events
    authBloc.add(CheckAuthStatusEvent());
    settingsBloc.add(LoadSettingsEvent());
    
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: authBloc),
        if (attendanceBloc != null) BlocProvider.value(value: attendanceBloc),
        if (notificationsBloc != null) BlocProvider.value(value: notificationsBloc),
        BlocProvider.value(value: settingsBloc),
        if (leavesBloc != null) BlocProvider.value(value: leavesBloc),
        if (lettersBloc != null) BlocProvider.value(value: lettersBloc),
        if (raisesBloc != null) BlocProvider.value(value: raisesBloc),
        if (tasksBloc != null) BlocProvider.value(value: tasksBloc),
      ],
      child: BlocBuilder<SettingsBloc, SettingsState>(
        builder: (context, settingsState) {
          return MaterialApp.router(
            title: 'نظام الحضور',
            debugShowCheckedModeBanner: false,
            
            // Theme
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: settingsState.themeMode,
            
            // Localization
            locale: settingsState.locale,
            supportedLocales: const [
              Locale('ar'),
              Locale('en'),
            ],
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            
            // Router
            routerConfig: AppRouter.router,
          );
        },
      ),
    );
  }
}

