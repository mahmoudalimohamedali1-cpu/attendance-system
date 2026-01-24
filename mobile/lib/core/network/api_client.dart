import 'package:flutter/foundation.dart';
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

  Future<Response> getUsers() async {
    return await _dio.get('/users');
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
    debugPrint('📤 Sending leave request to: ${_dio.options.baseUrl}/leaves');
    debugPrint('📤 Data: $data');
    try {
      final response = await _dio.post('/leaves', data: data);
      debugPrint('✅ Response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error in createLeaveRequest: $e');
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
    debugPrint('📤 Uploading ${filePaths.length} attachments');
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
    debugPrint('📤 Fetching pending leaves from: ${_dio.options.baseUrl}/leaves/pending/all');
    debugPrint('📤 Params: $params');
    try {
      final response = await _dio.get('/leaves/pending/all', queryParameters: params);
      debugPrint('✅ Pending leaves response: ${response.statusCode}');
      debugPrint('✅ Response data: ${response.data}');
      return response;
    } catch (e) {
      debugPrint('❌ Error fetching pending leaves: $e');
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
    debugPrint('📤 Sending letter request to: ${_dio.options.baseUrl}/letters');
    debugPrint('📤 Data: $data');
    try {
      final response = await _dio.post('/letters', data: data);
      debugPrint('✅ Response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error in createLetterRequest: $e');
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
    debugPrint('📤 Uploading ${filePaths.length} attachments');
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
    debugPrint('📤 Fetching pending letters from: ${_dio.options.baseUrl}/letters/pending/all');
    debugPrint('📤 Params: $params');
    try {
      final response = await _dio.get('/letters/pending/all', queryParameters: params);
      debugPrint('✅ Pending letters response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error fetching pending letters: $e');
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

  // Permissions endpoints
  Future<Response> getMyPermissions() async {
    debugPrint('📤 Fetching my permissions from: ${_dio.options.baseUrl}/permissions/my');
    try {
      final response = await _dio.get('/permissions/my');
      debugPrint('✅ Permissions response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error fetching permissions: $e');
      rethrow;
    }
  }

  // Raises endpoints
  Future<Response> createRaiseRequest(Map<String, dynamic> data) async {
    debugPrint('📤 Sending raise request to: ${_dio.options.baseUrl}/raises');
    debugPrint('📤 Data: $data');
    try {
      final response = await _dio.post('/raises', data: data);
      debugPrint('✅ Response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error in createRaiseRequest: $e');
      rethrow;
    }
  }

  Future<Response> getMyRaiseRequests() async {
    return await _dio.get('/raises/my');
  }

  Future<Response> cancelRaiseRequest(String id) async {
    return await _dio.post('/raises/$id/cancel', data: {});
  }

  Future<Response> getRaiseStats() async {
    return await _dio.get('/raises/stats');
  }

  Future<Response> uploadRaiseAttachments(List<String> filePaths) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path, filename: path.split('/').last),
      ));
    }
    debugPrint('📤 Uploading ${filePaths.length} raise attachments');
    return await _dio.post('/raises/upload-attachments', data: formData);
  }

  // ==================== Disciplinary endpoints ====================
  
  /// جلب قضايا الجزاءات حسب الدور
  Future<Response> getDisciplinaryCases(String role) async {
    return await _dio.get('/disciplinary/cases', queryParameters: {'role': role});
  }

  /// جلب تفاصيل قضية
  Future<Response> getDisciplinaryCaseById(String id) async {
    return await _dio.get('/disciplinary/cases/$id');
  }

  /// إنشاء قضية جديدة (للمدير)
  Future<Response> createDisciplinaryCase(Map<String, dynamic> data) async {
    return await _dio.post('/disciplinary/cases', data: data);
  }

  /// الرد على التحقيق غير الرسمي (للموظف)
  Future<Response> respondDisciplinaryInformal(String caseId, {required bool accept, String? notes}) async {
    return await _dio.post('/disciplinary/cases/$caseId/employee-informal-response', data: {
      'accept': accept,
      'response': notes,
    });
  }

  /// الرد على القرار (للموظف)
  Future<Response> respondDisciplinaryDecision(String caseId, {required bool accept, String? objectionNotes}) async {
    return await _dio.post('/disciplinary/cases/$caseId/employee-decision-response', data: {
      'accept': accept,
      'objectionNotes': objectionNotes,
    });
  }

  /// مراجعة HR
  Future<Response> hrReviewDisciplinary(String caseId, {required bool approve, String? notes}) async {
    return await _dio.post('/disciplinary/cases/$caseId/hr-review', data: {
      'approve': approve,
      'notes': notes,
    });
  }

  /// جدولة جلسة استماع
  Future<Response> scheduleDisciplinaryHearing(String caseId, Map<String, dynamic> data) async {
    return await _dio.post('/disciplinary/cases/$caseId/schedule-hearing', data: data);
  }

  /// إضافة محضر الجلسة
  Future<Response> addDisciplinaryMinutes(String caseId, String notes) async {
    return await _dio.post('/disciplinary/cases/$caseId/minutes', data: {'notes': notes});
  }

  /// إصدار قرار
  Future<Response> issueDisciplinaryDecision(String caseId, Map<String, dynamic> data) async {
    return await _dio.post('/disciplinary/cases/$caseId/decision', data: data);
  }

  /// الاعتماد النهائي
  Future<Response> finalizeDisciplinaryCase(String caseId) async {
    return await _dio.post('/disciplinary/cases/$caseId/finalize', data: {});
  }

  /// رفع مرفقات قضية جزائية
  Future<Response> uploadDisciplinaryAttachments(String caseId, List<String> filePaths) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path, filename: path.split('/').last),
      ));
    }
    debugPrint('📤 Uploading ${filePaths.length} disciplinary attachments for case $caseId');
    return await _dio.post('/disciplinary/cases/$caseId/upload-files', data: formData);
  }

  // ==================== Location Tracking endpoints ====================
  
  /// تحديث موقع الموظف (للتتبع بعد تسجيل الحضور)
  Future<Response> updateLocation(Map<String, dynamic> data) async {
    return await _dio.post('/location-tracking/update', data: data);
  }

  // ==================== Social Feed endpoints ====================

  /// جلب المنشورات (Feed)
  Future<Response> getSocialFeed(Map<String, dynamic> params) async {
    debugPrint('📤 Fetching social feed from: ${_dio.options.baseUrl}/social-feed');
    return await _dio.get('/social-feed', queryParameters: params);
  }

  /// جلب منشور واحد
  Future<Response> getSocialPost(String postId) async {
    return await _dio.get('/social-feed/$postId');
  }

  /// إنشاء منشور جديد
  Future<Response> createSocialPost(Map<String, dynamic> data) async {
    debugPrint('📤 Creating social post');
    return await _dio.post('/social-feed', data: data);
  }

  /// إضافة تفاعل (Reaction)
  Future<Response> addReaction(String postId, String reactionType) async {
    return await _dio.post('/social-feed/$postId/react', data: {'emoji': reactionType});
  }

  /// إزالة تفاعل
  Future<Response> removeReaction(String postId) async {
    return await _dio.delete('/social-feed/$postId/react');
  }

  /// جلب التعليقات
  Future<Response> getComments(String postId, Map<String, dynamic> params) async {
    return await _dio.get('/social-feed/$postId/comments', queryParameters: params);
  }

  /// إضافة تعليق
  Future<Response> addComment(String postId, Map<String, dynamic> data) async {
    return await _dio.post('/social-feed/$postId/comments', data: data);
  }

  /// حذف تعليق
  Future<Response> deleteComment(String postId, String commentId) async {
    return await _dio.delete('/social-feed/$postId/comments/$commentId');
  }

  /// الإقرار بالمنشور
  Future<Response> acknowledgePost(String postId) async {
    return await _dio.post('/social-feed/$postId/acknowledge');
  }

  // ==================== Payslips endpoints ====================

  /// جلب كشوفات راتب الموظف
  Future<Response> getMyPayslips() async {
    debugPrint('📤 Fetching my payslips from: ${_dio.options.baseUrl}/payslips/my');
    try {
      final response = await _dio.get('/payslips/my');
      debugPrint('✅ Payslips response: ${response.statusCode}');
      return response;
    } catch (e) {
      debugPrint('❌ Error fetching payslips: $e');
      rethrow;
    }
  }

  /// جلب تفاصيل كشف راتب واحد
  Future<Response> getPayslipById(String id) async {
    return await _dio.get('/payslips/$id');
  }
}

