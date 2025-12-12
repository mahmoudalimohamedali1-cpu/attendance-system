abstract class NotificationsRepository {
  Future<dynamic> getNotifications(Map<String, dynamic> params);
  Future<dynamic> getUnreadCount();
  Future<void> markAsRead(String id);
  Future<void> markAllAsRead();
}

