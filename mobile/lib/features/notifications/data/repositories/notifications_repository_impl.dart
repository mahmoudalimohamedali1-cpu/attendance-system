import '../datasources/notifications_remote_datasource.dart';
import '../../domain/repositories/notifications_repository.dart';

class NotificationsRepositoryImpl implements NotificationsRepository {
  final NotificationsRemoteDataSource _remoteDataSource;

  NotificationsRepositoryImpl(this._remoteDataSource);

  @override
  Future<dynamic> getNotifications(Map<String, dynamic> params) async {
    return await _remoteDataSource.getNotifications(params);
  }

  @override
  Future<dynamic> getUnreadCount() async {
    return await _remoteDataSource.getUnreadCount();
  }

  @override
  Future<void> markAsRead(String id) async {
    await _remoteDataSource.markAsRead(id);
  }

  @override
  Future<void> markAllAsRead() async {
    await _remoteDataSource.markAllAsRead();
  }
}

