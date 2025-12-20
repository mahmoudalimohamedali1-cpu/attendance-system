// lib/features/raises/domain/repositories/raises_repository.dart
import '../entities/raise_request.dart';
import '../../data/models/raise_request_model.dart';

abstract class RaisesRepository {
  Future<List<RaiseRequest>> getMyRaiseRequests();
  Future<RaiseRequest> createRaiseRequest(CreateRaiseRequestDto dto);
  Future<void> cancelRaiseRequest(String id);
  Future<Map<String, int>> getStats();
}
