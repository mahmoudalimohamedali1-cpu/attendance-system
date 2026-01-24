import '../models/payslip_model.dart';
import '../datasources/payslips_remote_datasource.dart';
import '../../domain/repositories/payslips_repository.dart';

class PayslipsRepositoryImpl implements PayslipsRepository {
  final PayslipsRemoteDataSource _remoteDataSource;

  PayslipsRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<PayslipModel>> getMyPayslips() async {
    final data = await _remoteDataSource.getMyPayslips();
    if (data is List) {
      return data.map((e) => PayslipModel.fromJson(e)).toList();
    }
    return [];
  }

  @override
  Future<PayslipModel?> getPayslipById(String id) async {
    final data = await _remoteDataSource.getPayslipById(id);
    if (data != null) {
      return PayslipModel.fromJson(data);
    }
    return null;
  }
}
