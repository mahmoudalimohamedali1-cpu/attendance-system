abstract class LeavesRepository {
  Future<dynamic> createLeaveRequest(Map<String, dynamic> data);
  Future<dynamic> getMyLeaveRequests(Map<String, dynamic> params);
  Future<dynamic> cancelLeaveRequest(String id);
  Future<dynamic> uploadAttachments(List<String> filePaths);
  
  // Manager/Admin methods
  Future<dynamic> getPendingLeaveRequests(Map<String, dynamic> params);
  Future<dynamic> approveLeaveRequest(String id, {String? notes});
  Future<dynamic> rejectLeaveRequest(String id, {String? notes});
  Future<dynamic> getLeaveRequestById(String id);
}
