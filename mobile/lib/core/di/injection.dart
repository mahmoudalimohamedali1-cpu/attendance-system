import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../network/api_client.dart';
import '../network/auth_interceptor.dart';
import '../services/location_service.dart';
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

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  print('🔧 Starting dependency injection...');
  
  // External dependencies
  SharedPreferences? sharedPreferences;
  try {
    sharedPreferences = await SharedPreferences.getInstance();
    getIt.registerSingleton<SharedPreferences>(sharedPreferences);
    print('✅ SharedPreferences registered');
  } catch (e) {
    print('❌ Error initializing SharedPreferences: $e');
    rethrow;
  }
  
  try {
    const secureStorage = FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    );
    getIt.registerSingleton<FlutterSecureStorage>(secureStorage);
    print('✅ FlutterSecureStorage registered');
  } catch (e) {
    print('❌ Error initializing FlutterSecureStorage: $e');
    rethrow;
  }
  
  // Services
  try {
    getIt.registerLazySingleton<StorageService>(
      () => StorageService(getIt<SharedPreferences>(), getIt<FlutterSecureStorage>()),
    );
    print('✅ StorageService registered');
  } catch (e) {
    print('❌ Error registering StorageService: $e');
  }
  
  getIt.registerLazySingleton<LocationService>(
    () => LocationService(),
  );
  
  getIt.registerLazySingleton<NotificationService>(
    () => NotificationService(),
  );
  print('✅ Services registered');
  
  // Network - استخدام الإعدادات من AppConfig
  print('🔧 Setting up Network...');
  try {
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: Duration(milliseconds: AppConfig.connectionTimeout),
      receiveTimeout: Duration(milliseconds: AppConfig.receiveTimeout),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Add AuthInterceptor - make sure StorageService is registered first
    try {
      dio.interceptors.add(AuthInterceptor(getIt<StorageService>()));
      print('✅ AuthInterceptor added');
    } catch (e) {
      print('⚠️ Warning: Could not add AuthInterceptor: $e');
      // Continue without auth interceptor - app should still work
    }
    
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (obj) => print('🌐 API: $obj'),
    ));
    
    getIt.registerSingleton<Dio>(dio);
    print('✅ Dio registered');
  } catch (e) {
    print('❌ Error setting up Network: $e');
    rethrow;
  }
  
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(getIt()),
  );
  
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
  print('🔧 Registering Use Cases...');
  try {
    getIt.registerLazySingleton<LoginUseCase>(
      () => LoginUseCase(getIt<AuthRepository>()),
    );
    print('✅ LoginUseCase registered');
  } catch (e) {
    print('❌ Error registering LoginUseCase: $e');
    rethrow;
  }
  
  try {
    getIt.registerLazySingleton<LogoutUseCase>(
      () => LogoutUseCase(getIt<AuthRepository>()),
    );
    print('✅ LogoutUseCase registered');
  } catch (e) {
    print('❌ Error registering LogoutUseCase: $e');
    rethrow;
  }
  
  try {
    getIt.registerLazySingleton<RefreshTokenUseCase>(
      () => RefreshTokenUseCase(getIt<AuthRepository>()),
    );
    print('✅ RefreshTokenUseCase registered');
  } catch (e) {
    print('❌ Error registering RefreshTokenUseCase: $e');
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
  
  print('✅ All Use Cases registered');
  
  // Blocs
  print('🔧 Registering Blocs...');
  
  try {
    getIt.registerFactory<AuthBloc>(
      () {
        print('🔧 Creating AuthBloc instance...');
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
    print('✅ AuthBloc registered');
  } catch (e) {
    print('❌ Error registering AuthBloc: $e');
    rethrow;
  }
  
  getIt.registerFactory<AttendanceBloc>(
    () => AttendanceBloc(
      checkInUseCase: getIt<CheckInUseCase>(),
      checkOutUseCase: getIt<CheckOutUseCase>(),
      getHistoryUseCase: getIt<GetAttendanceHistoryUseCase>(),
      getTodayAttendanceUseCase: getIt<GetTodayAttendanceUseCase>(),
      locationService: getIt<LocationService>(),
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
  
  print('✅ All Blocs registered');
}
