import '../../../../core/network/api_client.dart';

abstract class PayslipsRemoteDataSource {
  Future<dynamic> getMyPayslips();
  Future<dynamic> getPayslipById(String id);
}

class PayslipsRemoteDataSourceImpl implements PayslipsRemoteDataSource {
  final ApiClient _apiClient;

  PayslipsRemoteDataSourceImpl(this._apiClient);

  @override
  Future<dynamic> getMyPayslips() async {
    final response = await _apiClient.getMyPayslips();
    return response.data;
  }

  @override
  Future<dynamic> getPayslipById(String id) async {
    final response = await _apiClient.getPayslipById(id);
    return response.data;
  }
}
