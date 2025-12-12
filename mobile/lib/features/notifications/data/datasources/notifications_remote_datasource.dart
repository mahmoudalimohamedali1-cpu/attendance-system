import '../../../../core/network/api_client.dart';

abstract class NotificationsRemoteDataSource {
  Future<dynamic> getNotifications(Map<String, dynamic> params);
  Future<dynamic> getUnreadCount();
  Future<void> markAsRead(String id);
  Future<void> markAllAsRead();
}

class NotificationsRemoteDataSourceImpl implements NotificationsRemoteDataSource {
  final ApiClient _apiClient;

  NotificationsRemoteDataSourceImpl(this._apiClient);

  @override
  Future<dynamic> getNotifications(Map<String, dynamic> params) async {
    final response = await _apiClient.getNotifications(params);
    return response.data;
  }

  @override
  Future<dynamic> getUnreadCount() async {
    final response = await _apiClient.getUnreadCount();
    return response.data;
  }

  @override
  Future<void> markAsRead(String id) async {
    await _apiClient.markAsRead(id);
  }

  @override
  Future<void> markAllAsRead() async {
    await _apiClient.markAllAsRead();
  }
}

