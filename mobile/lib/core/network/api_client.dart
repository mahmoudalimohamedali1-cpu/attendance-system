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
    // Log the data being sent for debugging
    print('📤 Sending leave request to: ${_dio.options.baseUrl}/leaves');
    print('📤 Data: $data');
    try {
      final response = await _dio.post('/leaves', data: data);
      print('✅ Response: ${response.statusCode}');
      return response;
    } catch (e) {
      print('❌ Error in createLeaveRequest: $e');
      rethrow;
    }
  }

  // رفع مرفقات الإجازة
  Future<Response> uploadLeaveAttachments(List<String> filePaths) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path, filename: path.split('/').last),
      ));
    }
    print('📤 Uploading ${filePaths.length} attachments');
    return await _dio.post('/leaves/upload-attachments', data: formData);
  }

  Future<Response> getMyLeaveRequests(Map<String, dynamic> params) async {
    return await _dio.get('/leaves/my', queryParameters: params);
  }

  Future<Response> cancelLeaveRequest(String id) async {
    return await _dio.delete('/leaves/$id');
  }

  // Manager/Admin endpoints for leave approvals
  Future<Response> getPendingLeaveRequests(Map<String, dynamic> params) async {
    print('📤 Fetching pending leaves from: ${_dio.options.baseUrl}/leaves/pending/all');
    print('📤 Params: $params');
    try {
      final response = await _dio.get('/leaves/pending/all', queryParameters: params);
      print('✅ Pending leaves response: ${response.statusCode}');
      print('✅ Response data: ${response.data}');
      return response;
    } catch (e) {
      print('❌ Error fetching pending leaves: $e');
      rethrow;
    }
  }

  Future<Response> approveLeaveRequest(String id, {String? notes}) async {
    return await _dio.patch('/leaves/$id/approve', data: notes != null ? {'notes': notes} : {});
  }

  Future<Response> rejectLeaveRequest(String id, {String? notes}) async {
    return await _dio.patch('/leaves/$id/reject', data: notes != null ? {'notes': notes} : {});
  }

  Future<Response> getLeaveRequestById(String id) async {
    return await _dio.get('/leaves/$id');
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

  // Letters endpoints
  Future<Response> createLetterRequest(Map<String, dynamic> data) async {
    print('📤 Sending letter request to: ${_dio.options.baseUrl}/letters');
    print('📤 Data: $data');
    try {
      final response = await _dio.post('/letters', data: data);
      print('✅ Response: ${response.statusCode}');
      return response;
    } catch (e) {
      print('❌ Error in createLetterRequest: $e');
      rethrow;
    }
  }

  Future<Response> uploadLetterAttachments(List<String> filePaths) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path, filename: path.split('/').last),
      ));
    }
    print('📤 Uploading ${filePaths.length} attachments');
    return await _dio.post('/letters/upload-attachments', data: formData);
  }

  Future<Response> getMyLetterRequests(Map<String, dynamic> params) async {
    return await _dio.get('/letters/my', queryParameters: params);
  }

  Future<Response> cancelLetterRequest(String id) async {
    return await _dio.delete('/letters/$id');
  }

  // Manager/Admin endpoints for letter approvals
  Future<Response> getPendingLetterRequests(Map<String, dynamic> params) async {
    print('📤 Fetching pending letters from: ${_dio.options.baseUrl}/letters/pending/all');
    print('📤 Params: $params');
    try {
      final response = await _dio.get('/letters/pending/all', queryParameters: params);
      print('✅ Pending letters response: ${response.statusCode}');
      return response;
    } catch (e) {
      print('❌ Error fetching pending letters: $e');
      rethrow;
    }
  }

  Future<Response> approveLetterRequest(String id, {String? notes}) async {
    return await _dio.patch('/letters/$id/approve', data: notes != null ? {'notes': notes} : {});
  }

  Future<Response> rejectLetterRequest(String id, {String? notes}) async {
    return await _dio.patch('/letters/$id/reject', data: notes != null ? {'notes': notes} : {});
  }

  Future<Response> getLetterRequestById(String id) async {
    return await _dio.get('/letters/$id');
  }
}

