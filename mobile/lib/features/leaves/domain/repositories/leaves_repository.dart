abstract class LeavesRepository {
  Future<dynamic> createLeaveRequest(Map<String, dynamic> data);
  Future<dynamic> getMyLeaveRequests(Map<String, dynamic> params);
  Future<dynamic> cancelLeaveRequest(String id);
}

