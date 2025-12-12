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

import '../../features/notifications/data/datasources/notifications_remote_datasource.dart';
import '../../features/notifications/data/repositories/notifications_repository_impl.dart';
import '../../features/notifications/domain/repositories/notifications_repository.dart';
import '../../features/notifications/presentation/bloc/notifications_bloc.dart';

import '../../features/settings/presentation/bloc/settings_bloc.dart';

final getIt = GetIt.instance;

Future<void> configureDependencies() async {
  // External dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  getIt.registerSingleton<SharedPreferences>(sharedPreferences);
  
  const secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  getIt.registerSingleton<FlutterSecureStorage>(secureStorage);
  
  // Services
  getIt.registerLazySingleton<StorageService>(
    () => StorageService(getIt(), getIt()),
  );
  
  getIt.registerLazySingleton<LocationService>(
    () => LocationService(),
  );
  
  getIt.registerLazySingleton<NotificationService>(
    () => NotificationService(),
  );
  
  // Network - استخدام الإعدادات من AppConfig
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: Duration(milliseconds: AppConfig.connectionTimeout),
    receiveTimeout: Duration(milliseconds: AppConfig.receiveTimeout),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));
  
  dio.interceptors.add(AuthInterceptor(getIt()));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    logPrint: (obj) => print('🌐 API: $obj'),
  ));
  
  getIt.registerSingleton<Dio>(dio);
  
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
  
  getIt.registerLazySingleton<NotificationsRemoteDataSource>(
    () => NotificationsRemoteDataSourceImpl(getIt()),
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
  
  getIt.registerLazySingleton<NotificationsRepository>(
    () => NotificationsRepositoryImpl(getIt()),
  );
  
  // Use cases
  getIt.registerLazySingleton(() => LoginUseCase(getIt()));
  getIt.registerLazySingleton(() => LogoutUseCase(getIt()));
  getIt.registerLazySingleton(() => RefreshTokenUseCase(getIt()));
  getIt.registerLazySingleton(() => CheckInUseCase(getIt()));
  getIt.registerLazySingleton(() => CheckOutUseCase(getIt()));
  getIt.registerLazySingleton(() => GetAttendanceHistoryUseCase(getIt()));
  getIt.registerLazySingleton(() => GetTodayAttendanceUseCase(getIt()));
  
  // Blocs
  getIt.registerFactory<AuthBloc>(
    () => AuthBloc(
      loginUseCase: getIt(),
      logoutUseCase: getIt(),
      refreshTokenUseCase: getIt(),
      storageService: getIt(),
    ),
  );
  
  getIt.registerFactory<AttendanceBloc>(
    () => AttendanceBloc(
      checkInUseCase: getIt(),
      checkOutUseCase: getIt(),
      getHistoryUseCase: getIt(),
      getTodayAttendanceUseCase: getIt(),
      locationService: getIt(),
    ),
  );
  
  getIt.registerFactory<LeavesBloc>(
    () => LeavesBloc(getIt()),
  );
  
  getIt.registerFactory<NotificationsBloc>(
    () => NotificationsBloc(getIt()),
  );
  
  getIt.registerFactory<SettingsBloc>(
    () => SettingsBloc(getIt()),
  );
}
