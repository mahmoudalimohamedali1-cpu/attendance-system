import 'package:dio/dio.dart';

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Dio get dio => _dio;

  // Auth endpoints
  Future<Response> login(Map<String, dynamic> data) async {
    return await _dio.post('/auth/login', data: data);
  }

  Future<Response> refreshToken(String refreshToken) async {
    return await _dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
  }

  Future<Response> logout(String? refreshToken) async {
    return await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
  }

  Future<Response> forgotPassword(String email) async {
    return await _dio.post('/auth/forgot-password', data: {'email': email});
  }

  Future<Response> updateFcmToken(String fcmToken) async {
    return await _dio.post('/auth/fcm-token', data: {'fcmToken': fcmToken});
  }

  // User endpoints
  Future<Response> getProfile() async {
    return await _dio.get('/users/me');
  }

  Future<Response> updateProfile(Map<String, dynamic> data) async {
    return await _dio.patch('/users/me', data: data);
  }

  Future<Response> changePassword(Map<String, dynamic> data) async {
    return await _dio.post('/users/me/change-password', data: data);
  }

  // Attendance endpoints
  Future<Response> checkIn(Map<String, dynamic> data) async {
    return await _dio.post('/attendance/check-in', data: data);
  }

  Future<Response> checkOut(Map<String, dynamic> data) async {
    return await _dio.post('/attendance/check-out', data: data);
  }

  Future<Response> getTodayAttendance() async {
    return await _dio.get('/attendance/today');
  }

  Future<Response> getAttendanceHistory(Map<String, dynamic> params) async {
    return await _dio.get('/attendance/history', queryParameters: params);
  }

  Future<Response> getMonthlyStats(int year, int month) async {
    return await _dio.get('/attendance/stats/monthly/$year/$month');
  }

  // Leaves endpoints
  Future<Response> createLeaveRequest(Map<String, dynamic> data) async {
    return await _dio.post('/leaves', data: data);
  }

  Future<Response> getMyLeaveRequests(Map<String, dynamic> params) async {
    return await _dio.get('/leaves/my', queryParameters: params);
  }

  Future<Response> cancelLeaveRequest(String id) async {
    return await _dio.delete('/leaves/$id');
  }

  // Notifications endpoints
  Future<Response> getNotifications(Map<String, dynamic> params) async {
    return await _dio.get('/notifications', queryParameters: params);
  }

  Future<Response> getUnreadCount() async {
    return await _dio.get('/notifications/unread-count');
  }

  Future<Response> markAsRead(String id) async {
    return await _dio.patch('/notifications/$id/read');
  }

  Future<Response> markAllAsRead() async {
    return await _dio.patch('/notifications/read-all');
  }

  // Branches endpoints
  Future<Response> getBranches() async {
    return await _dio.get('/branches');
  }
}

