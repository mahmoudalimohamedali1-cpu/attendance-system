// lib/features/raises/data/repositories/raises_repository_impl.dart
import '../../domain/entities/raise_request.dart';
import '../../domain/repositories/raises_repository.dart';
import '../datasources/raises_remote_datasource.dart';
import '../models/raise_request_model.dart';

class RaisesRepositoryImpl implements RaisesRepository {
  final RaisesRemoteDatasource remoteDatasource;

  RaisesRepositoryImpl({required this.remoteDatasource});

  @override
  Future<List<RaiseRequest>> getMyRaiseRequests() async {
    return await remoteDatasource.getMyRaiseRequests();
  }

  @override
  Future<RaiseRequest> createRaiseRequest(CreateRaiseRequestDto dto) async {
    return await remoteDatasource.createRaiseRequest(dto);
  }

  @override
  Future<void> cancelRaiseRequest(String id) async {
    await remoteDatasource.cancelRaiseRequest(id);
  }

  @override
  Future<Map<String, int>> getStats() async {
    return await remoteDatasource.getStats();
  }
}
