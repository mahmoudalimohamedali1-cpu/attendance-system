import '../../../../core/network/api_client.dart';

abstract class LeavesRemoteDataSource {
  Future<dynamic> createLeaveRequest(Map<String, dynamic> data);
  Future<dynamic> getMyLeaveRequests(Map<String, dynamic> params);
  Future<dynamic> cancelLeaveRequest(String id);
}

class LeavesRemoteDataSourceImpl implements LeavesRemoteDataSource {
  final ApiClient _apiClient;

  LeavesRemoteDataSourceImpl(this._apiClient);

  @override
  Future<dynamic> createLeaveRequest(Map<String, dynamic> data) async {
    final response = await _apiClient.createLeaveRequest(data);
    return response.data;
  }

  @override
  Future<dynamic> getMyLeaveRequests(Map<String, dynamic> params) async {
    final response = await _apiClient.getMyLeaveRequests(params);
    return response.data;
  }

  @override
  Future<dynamic> cancelLeaveRequest(String id) async {
    final response = await _apiClient.cancelLeaveRequest(id);
    return response.data;
  }
}

