import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/notifications_repository.dart';

// Events
abstract class NotificationsEvent extends Equatable {
  const NotificationsEvent();
  @override
  List<Object?> get props => [];
}

class GetNotificationsEvent extends NotificationsEvent {}
class MarkAsReadEvent extends NotificationsEvent {
  final String id;
  const MarkAsReadEvent(this.id);
}
class MarkAllAsReadEvent extends NotificationsEvent {}

// States
abstract class NotificationsState extends Equatable {
  const NotificationsState();
  @override
  List<Object?> get props => [];
}

class NotificationsInitial extends NotificationsState {}
class NotificationsLoading extends NotificationsState {}
class NotificationsLoaded extends NotificationsState {
  final List<dynamic> notifications;
  final int unreadCount;
  const NotificationsLoaded(this.notifications, this.unreadCount);
}
class NotificationsError extends NotificationsState {
  final String message;
  const NotificationsError(this.message);
}

// Bloc
class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  final NotificationsRepository repository;

  NotificationsBloc(this.repository) : super(NotificationsInitial()) {
    on<GetNotificationsEvent>(_onGetNotifications);
    on<MarkAsReadEvent>(_onMarkAsRead);
    on<MarkAllAsReadEvent>(_onMarkAllAsRead);
  }

  Future<void> _onGetNotifications(GetNotificationsEvent event, Emitter<NotificationsState> emit) async {
    emit(NotificationsLoading());
    try {
      final result = await repository.getNotifications({});
      final unreadResult = await repository.getUnreadCount();
      emit(NotificationsLoaded(
        result['data'] ?? [],
        unreadResult['count'] ?? 0,
      ));
    } catch (e) {
      emit(NotificationsError(e.toString()));
    }
  }

  Future<void> _onMarkAsRead(MarkAsReadEvent event, Emitter<NotificationsState> emit) async {
    try {
      await repository.markAsRead(event.id);
      add(GetNotificationsEvent());
    } catch (e) {
      // Silently fail
    }
  }

  Future<void> _onMarkAllAsRead(MarkAllAsReadEvent event, Emitter<NotificationsState> emit) async {
    try {
      await repository.markAllAsRead();
      add(GetNotificationsEvent());
    } catch (e) {
      // Silently fail
    }
  }
}

