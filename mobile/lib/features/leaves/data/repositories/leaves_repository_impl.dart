import '../datasources/leaves_remote_datasource.dart';
import '../../domain/repositories/leaves_repository.dart';

class LeavesRepositoryImpl implements LeavesRepository {
  final LeavesRemoteDataSource _remoteDataSource;

  LeavesRepositoryImpl(this._remoteDataSource);

  @override
  Future<dynamic> createLeaveRequest(Map<String, dynamic> data) async {
    return await _remoteDataSource.createLeaveRequest(data);
  }

  @override
  Future<dynamic> getMyLeaveRequests(Map<String, dynamic> params) async {
    return await _remoteDataSource.getMyLeaveRequests(params);
  }

  @override
  Future<dynamic> cancelLeaveRequest(String id) async {
    return await _remoteDataSource.cancelLeaveRequest(id);
  }
}

