// lib/features/raises/data/datasources/raises_remote_datasource.dart
import '../../../../core/network/api_client.dart';
import '../models/raise_request_model.dart';

abstract class RaisesRemoteDatasource {
  Future<List<RaiseRequestModel>> getMyRaiseRequests();
  Future<RaiseRequestModel> createRaiseRequest(CreateRaiseRequestDto dto);
  Future<void> cancelRaiseRequest(String id);
  Future<Map<String, int>> getStats();
}

class RaisesRemoteDatasourceImpl implements RaisesRemoteDatasource {
  final ApiClient apiClient;

  RaisesRemoteDatasourceImpl({required this.apiClient});

  @override
  Future<List<RaiseRequestModel>> getMyRaiseRequests() async {
    final response = await apiClient.getMyRaiseRequests();
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => RaiseRequestModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  @override
  Future<RaiseRequestModel> createRaiseRequest(CreateRaiseRequestDto dto) async {
    // First, upload attachments if any
    List<String>? uploadedAttachments;
    if (dto.attachmentPaths != null && dto.attachmentPaths!.isNotEmpty) {
      print('📤 Uploading ${dto.attachmentPaths!.length} attachments...');
      final uploadResponse = await apiClient.uploadRaiseAttachments(dto.attachmentPaths!);
      final uploadData = uploadResponse.data as Map<String, dynamic>;
      final files = uploadData['files'] as List<dynamic>;
      uploadedAttachments = files.map((f) => f['path'] as String).toList();
      print('✅ Uploaded attachments: $uploadedAttachments');
    }
    
    // Create the request data with uploaded attachment URLs
    final requestData = dto.toJson();
    if (uploadedAttachments != null && uploadedAttachments.isNotEmpty) {
      requestData['attachments'] = uploadedAttachments;
    }
    
    final response = await apiClient.createRaiseRequest(requestData);
    return RaiseRequestModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> cancelRaiseRequest(String id) async {
    await apiClient.cancelRaiseRequest(id);
  }

  @override
  Future<Map<String, int>> getStats() async {
    final response = await apiClient.getRaiseStats();
    final data = response.data as Map<String, dynamic>;
    return {
      'pending': data['pending'] as int? ?? 0,
      'approved': data['approved'] as int? ?? 0,
      'rejected': data['rejected'] as int? ?? 0,
      'total': data['total'] as int? ?? 0,
    };
  }
}
