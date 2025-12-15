import '../../../../core/network/api_client.dart';

abstract class LettersRemoteDataSource {
  Future<dynamic> createLetterRequest(Map<String, dynamic> data);
  Future<dynamic> getMyLetterRequests(Map<String, dynamic> params);
  Future<dynamic> cancelLetterRequest(String id);
  Future<dynamic> uploadAttachments(List<String> filePaths);
  
  // Manager/Admin methods
  Future<dynamic> getPendingLetterRequests(Map<String, dynamic> params);
  Future<dynamic> approveLetterRequest(String id, {String? notes});
  Future<dynamic> rejectLetterRequest(String id, {String? notes});
  Future<dynamic> getLetterRequestById(String id);
}

class LettersRemoteDataSourceImpl implements LettersRemoteDataSource {
  final ApiClient _apiClient;

  LettersRemoteDataSourceImpl(this._apiClient);

  @override
  Future<dynamic> createLetterRequest(Map<String, dynamic> data) async {
    final response = await _apiClient.createLetterRequest(data);
    return response.data;
  }

  @override
  Future<dynamic> getMyLetterRequests(Map<String, dynamic> params) async {
    final response = await _apiClient.getMyLetterRequests(params);
    return response.data;
  }

  @override
  Future<dynamic> cancelLetterRequest(String id) async {
    final response = await _apiClient.cancelLetterRequest(id);
    return response.data;
  }

  @override
  Future<dynamic> uploadAttachments(List<String> filePaths) async {
    final response = await _apiClient.uploadLetterAttachments(filePaths);
    return response.data;
  }

  @override
  Future<dynamic> getPendingLetterRequests(Map<String, dynamic> params) async {
    final response = await _apiClient.getPendingLetterRequests(params);
    return response.data;
  }

  @override
  Future<dynamic> approveLetterRequest(String id, {String? notes}) async {
    final response = await _apiClient.approveLetterRequest(id, notes: notes);
    return response.data;
  }

  @override
  Future<dynamic> rejectLetterRequest(String id, {String? notes}) async {
    final response = await _apiClient.rejectLetterRequest(id, notes: notes);
    return response.data;
  }

  @override
  Future<dynamic> getLetterRequestById(String id) async {
    final response = await _apiClient.getLetterRequestById(id);
    return response.data;
  }
}

