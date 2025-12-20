import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/notification_service.dart';
import '../../../../core/services/permissions_service.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/refresh_token_usecase.dart';

// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class CheckAuthStatusEvent extends AuthEvent {}

class LoginEvent extends AuthEvent {
  final String email;
  final String password;
  final bool rememberMe;

  const LoginEvent({
    required this.email,
    required this.password,
    this.rememberMe = false,
  });

  @override
  List<Object?> get props => [email, password, rememberMe];
}

class LogoutEvent extends AuthEvent {}

class RefreshTokenEvent extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final UserEntity user;

  const AuthAuthenticated(this.user);

  @override
  List<Object?> get props => [user];
}

class AuthUnauthenticated extends AuthState {
  final String? lastEmail;
  final bool rememberMe;

  const AuthUnauthenticated({
    this.lastEmail,
    this.rememberMe = false,
  });

  @override
  List<Object?> get props => [lastEmail, rememberMe];
}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}

// Bloc
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase loginUseCase;
  final LogoutUseCase logoutUseCase;
  final RefreshTokenUseCase refreshTokenUseCase;
  final StorageService storageService;
  final NotificationService notificationService;
  final AuthRepository authRepository;

  AuthBloc({
    required this.loginUseCase,
    required this.logoutUseCase,
    required this.refreshTokenUseCase,
    required this.storageService,
    required this.notificationService,
    required this.authRepository,
  }) : super(AuthInitial()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<LoginEvent>(_onLogin);
    on<LogoutEvent>(_onLogout);
    on<RefreshTokenEvent>(_onRefreshToken);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      emit(AuthLoading());

      final token = await storageService.getAccessToken();
      final userData = await storageService.getUserData();

      if (token != null && userData != null) {
        // Try to get user from cache
        // In real app, you might want to refresh the token here
        try {
          // For now, we'll just parse the cached user
          final userJson = await storageService.getUserData();
          if (userJson != null) {
            // Parse and emit authenticated state
            // This is simplified - in production, parse the JSON properly
            final refreshToken = await storageService.getRefreshToken();
            if (refreshToken != null) {
              add(RefreshTokenEvent());
              return;
            }
          }
        } catch (e) {
          print('⚠️ Error checking auth status: $e');
          // If anything fails, show unauthenticated
        }
      }

      final lastEmail = storageService.getLastEmail();
      final rememberMe = storageService.getRememberMe();

      emit(AuthUnauthenticated(
        lastEmail: rememberMe ? lastEmail : null,
        rememberMe: rememberMe,
      ));
    } catch (e) {
      print('❌ Critical error in CheckAuthStatus: $e');
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLogin(
    LoginEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    final result = await loginUseCase(
      email: event.email,
      password: event.password,
      rememberMe: event.rememberMe,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (authResult) async {
        emit(AuthAuthenticated(authResult.user));
        
        // Fetch and cache user permissions
        try {
          await getPermissionsService().fetchMyPermissions();
        } catch (e) {
          print('⚠️ Failed to fetch permissions: $e');
        }
        
        // Send FCM token to backend after successful login
        _sendFcmTokenToBackend();
      },
    );
  }

  Future<void> _sendFcmTokenToBackend() async {
    try {
      final fcmToken = await notificationService.getFCMToken();
      if (fcmToken != null) {
        print('📱 Sending FCM token to backend: $fcmToken');
        await authRepository.updateFcmToken(fcmToken);
        print('✅ FCM token sent successfully');
      } else {
        print('⚠️ FCM token is null');
      }
    } catch (e) {
      print('❌ Failed to send FCM token: $e');
      // Don't emit error - FCM token update is not critical
    }
  }

  Future<void> _onLogout(
    LogoutEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    await logoutUseCase();

    final lastEmail = storageService.getLastEmail();
    final rememberMe = storageService.getRememberMe();

    emit(AuthUnauthenticated(
      lastEmail: rememberMe ? lastEmail : null,
      rememberMe: rememberMe,
    ));
  }

  Future<void> _onRefreshToken(
    RefreshTokenEvent event,
    Emitter<AuthState> emit,
  ) async {
    final refreshToken = await storageService.getRefreshToken();
    
    if (refreshToken == null) {
      emit(const AuthUnauthenticated());
      return;
    }

    final result = await refreshTokenUseCase(refreshToken);

    result.fold(
      (failure) {
        emit(AuthUnauthenticated(
          lastEmail: storageService.getLastEmail(),
          rememberMe: storageService.getRememberMe(),
        ));
      },
      (authResult) async {
        emit(AuthAuthenticated(authResult.user));
        
        // Send FCM token to backend after token refresh
        _sendFcmTokenToBackend();
      },
    );
  }
}

