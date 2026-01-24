import '../../data/models/payslip_model.dart';

abstract class PayslipsRepository {
  Future<List<PayslipModel>> getMyPayslips();
  Future<PayslipModel?> getPayslipById(String id);
}
