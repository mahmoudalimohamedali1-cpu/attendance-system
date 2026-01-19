import 'package:flutter/foundation.dart';
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../network/api_client.dart';
import '../network/auth_interceptor.dart';
import '../services/location_service.dart';
import '../services/location_tracking_service.dart';
import '../services/notification_service.dart';
import '../services/storage_service.dart';

import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/refresh_token_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';

import '../../features/attendance/data/datasources/attendance_remote_datasource.dart';
import '../../features/attendance/data/repositories/attendance_repository_impl.dart';
import '../../features/attendance/domain/repositories/attendance_repository.dart';
import '../../features/attendance/domain/usecases/check_in_usecase.dart';
import '../../features/attendance/domain/usecases/check_out_usecase.dart';
import '../../features/attendance/domain/usecases/get_attendance_history_usecase.dart';
import '../../features/attendance/domain/usecases/get_today_attendance_usecase.dart';
import '../../features/attendance/presentation/bloc/attendance_bloc.dart';

import '../../features/leaves/data/datasources/leaves_remote_datasource.dart';
import '../../features/leaves/data/repositories/leaves_repository_impl.dart';
import '../../features/leaves/domain/repositories/leaves_repository.dart';
import '../../features/leaves/presentation/bloc/leaves_bloc.dart';

import '../../features/letters/data/datasources/letters_remote_datasource.dart';
import '../../features/letters/data/repositories/letters_repository_impl.dart';
import '../../features/letters/domain/repositories/letters_repository.dart';
import '../../features/letters/presentation/bloc/letters_bloc.dart';

import '../../features/raises/data/datasources/raises_remote_datasource.dart';
import '../../features/raises/data/repositories/raises_repository_impl.dart';
import '../../features/raises/domain/repositories/raises_repository.dart';
import '../../features/raises/presentation/bloc/raises_bloc.dart';

import '../../features/notifications/data/datasources/notifications_remote_datasource.dart';
import '../../features/notifications/data/repositories/notifications_repository_impl.dart';
import '../../features/notifications/domain/repositories/notifications_repository.dart';
import '../../features/notifications/presentation/bloc/notifications_bloc.dart';

import '../../features/settings/presentation/bloc/settings_bloc.dart';
import '../../features/profile/presentation/bloc/profile_bloc.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  debugPrint('🔧 Starting dependency injection...');
  
  // External dependencies
  SharedPreferences? sharedPreferences;
  try {
    sharedPreferences = await SharedPreferences.getInstance();
    getIt.registerSingleton<SharedPreferences>(sharedPreferences);
    debugPrint('✅ SharedPreferences registered');
  } catch (e) {
    debugPrint('❌ Error initializing SharedPreferences: $e');
    rethrow;
  }
  
  try {
    const secureStorage = FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    );
    getIt.registerSingleton<FlutterSecureStorage>(secureStorage);
    debugPrint('✅ FlutterSecureStorage registered');
  } catch (e) {
    debugPrint('❌ Error initializing FlutterSecureStorage: $e');
    rethrow;
  }
  
  // Services
  try {
    getIt.registerLazySingleton<StorageService>(
      () => StorageService(getIt<SharedPreferences>(), getIt<FlutterSecureStorage>()),
    );
    debugPrint('✅ StorageService registered');
  } catch (e) {
    debugPrint('❌ Error registering StorageService: $e');
  }
  
  getIt.registerLazySingleton<LocationService>(
    () => LocationService(),
  );
  
  getIt.registerLazySingleton<NotificationService>(
    () => NotificationService(),
  );
  
  // تسجيل خدمة تتبع الموقع (يتم التسجيل بعد ApiClient)
  debugPrint('✅ Services registered');
  
  // Network - استخدام الإعدادات من AppConfig
  debugPrint('🔧 Setting up Network...');
  try {
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(milliseconds: AppConfig.connectionTimeout),
      receiveTimeout: const Duration(milliseconds: AppConfig.receiveTimeout),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Add AuthInterceptor - make sure StorageService is registered first
    try {
      dio.interceptors.add(AuthInterceptor(getIt<StorageService>()));
      debugPrint('✅ AuthInterceptor added');
    } catch (e) {
      debugPrint('⚠️ Warning: Could not add AuthInterceptor: $e');
      // Continue without auth interceptor - app should still work
    }
    
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (obj) => debugPrint('🌐 API: $obj'),
    ));
    
    getIt.registerSingleton<Dio>(dio);
    debugPrint('✅ Dio registered');
  } catch (e) {
    debugPrint('❌ Error setting up Network: $e');
    rethrow;
  }
  
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(getIt()),
  );
  
  // تسجيل خدمة تتبع الموقع (بعد ApiClient)
  getIt.registerLazySingleton<LocationTrackingService>(
    () => LocationTrackingService(getIt<ApiClient>(), getIt<LocationService>()),
  );
  debugPrint('✅ LocationTrackingService registered');
  
  // Data sources
  getIt.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(getIt()),
  );
  
  getIt.registerLazySingleton<AttendanceRemoteDataSource>(
    () => AttendanceRemoteDataSourceImpl(getIt()),
  );
  
  getIt.registerLazySingleton<LeavesRemoteDataSource>(
    () => LeavesRemoteDataSourceImpl(getIt()),
  );
  
  getIt.registerLazySingleton<LettersRemoteDataSource>(
    () => LettersRemoteDataSourceImpl(getIt()),
  );
  
  getIt.registerLazySingleton<NotificationsRemoteDataSource>(
    () => NotificationsRemoteDataSourceImpl(getIt()),
  );
  
  getIt.registerLazySingleton<RaisesRemoteDatasource>(
    () => RaisesRemoteDatasourceImpl(apiClient: getIt()),
  );
  
  // Repositories
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(getIt(), getIt()),
  );
  
  getIt.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(getIt()),
  );
  
  getIt.registerLazySingleton<LeavesRepository>(
    () => LeavesRepositoryImpl(getIt()),
  );
  
  getIt.registerLazySingleton<LettersRepository>(
    () => LettersRepositoryImpl(getIt()),
  );
  
  getIt.registerLazySingleton<NotificationsRepository>(
    () => NotificationsRepositoryImpl(getIt()),
  );
  
  getIt.registerLazySingleton<RaisesRepository>(
    () => RaisesRepositoryImpl(remoteDatasource: getIt()),
  );
  
  // Use cases
  debugPrint('🔧 Registering Use Cases...');
  try {
    getIt.registerLazySingleton<LoginUseCase>(
      () => LoginUseCase(getIt<AuthRepository>()),
    );
    debugPrint('✅ LoginUseCase registered');
  } catch (e) {
    debugPrint('❌ Error registering LoginUseCase: $e');
    rethrow;
  }
  
  try {
    getIt.registerLazySingleton<LogoutUseCase>(
      () => LogoutUseCase(getIt<AuthRepository>()),
    );
    debugPrint('✅ LogoutUseCase registered');
  } catch (e) {
    debugPrint('❌ Error registering LogoutUseCase: $e');
    rethrow;
  }
  
  try {
    getIt.registerLazySingleton<RefreshTokenUseCase>(
      () => RefreshTokenUseCase(getIt<AuthRepository>()),
    );
    debugPrint('✅ RefreshTokenUseCase registered');
  } catch (e) {
    debugPrint('❌ Error registering RefreshTokenUseCase: $e');
    rethrow;
  }
  
  getIt.registerLazySingleton<CheckInUseCase>(
    () => CheckInUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerLazySingleton<CheckOutUseCase>(
    () => CheckOutUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerLazySingleton<GetAttendanceHistoryUseCase>(
    () => GetAttendanceHistoryUseCase(getIt<AttendanceRepository>()),
  );
  
  getIt.registerLazySingleton<GetTodayAttendanceUseCase>(
    () => GetTodayAttendanceUseCase(getIt<AttendanceRepository>()),
  );
  
  debugPrint('✅ All Use Cases registered');
  
  // Blocs
  debugPrint('🔧 Registering Blocs...');
  
  try {
    getIt.registerFactory<AuthBloc>(
      () {
        debugPrint('🔧 Creating AuthBloc instance...');
        return AuthBloc(
          loginUseCase: getIt<LoginUseCase>(),
          logoutUseCase: getIt<LogoutUseCase>(),
          refreshTokenUseCase: getIt<RefreshTokenUseCase>(),
          storageService: getIt<StorageService>(),
          notificationService: getIt<NotificationService>(),
          authRepository: getIt<AuthRepository>(),
        );
      },
    );
    debugPrint('✅ AuthBloc registered');
  } catch (e) {
    debugPrint('❌ Error registering AuthBloc: $e');
    rethrow;
  }
  
  getIt.registerFactory<AttendanceBloc>(
    () => AttendanceBloc(
      checkInUseCase: getIt<CheckInUseCase>(),
      checkOutUseCase: getIt<CheckOutUseCase>(),
      getHistoryUseCase: getIt<GetAttendanceHistoryUseCase>(),
      getTodayAttendanceUseCase: getIt<GetTodayAttendanceUseCase>(),
      locationService: getIt<LocationService>(),
      locationTrackingService: getIt<LocationTrackingService>(),
    ),
  );
  
  getIt.registerFactory<LeavesBloc>(
    () => LeavesBloc(getIt<LeavesRepository>()),
  );
  
  getIt.registerFactory<LettersBloc>(
    () => LettersBloc(getIt<LettersRepository>()),
  );
  
  getIt.registerFactory<RaisesBloc>(
    () => RaisesBloc(repository: getIt<RaisesRepository>()),
  );
  
  getIt.registerFactory<NotificationsBloc>(
    () => NotificationsBloc(getIt<NotificationsRepository>()),
  );
  
  getIt.registerFactory<SettingsBloc>(
    () => SettingsBloc(getIt<StorageService>()),
  );

  getIt.registerFactory<ProfileBloc>(
    () => ProfileBloc(
      storageService: getIt<StorageService>(),
      apiClient: getIt<ApiClient>(),
    ),
  );

  debugPrint('✅ All Blocs registered');
}
