import '../datasources/letters_remote_datasource.dart';
import '../../domain/repositories/letters_repository.dart';

class LettersRepositoryImpl implements LettersRepository {
  final LettersRemoteDataSource _remoteDataSource;

  LettersRepositoryImpl(this._remoteDataSource);

  @override
  Future<dynamic> createLetterRequest(Map<String, dynamic> data) async {
    return await _remoteDataSource.createLetterRequest(data);
  }

  @override
  Future<dynamic> getMyLetterRequests(Map<String, dynamic> params) async {
    return await _remoteDataSource.getMyLetterRequests(params);
  }

  @override
  Future<dynamic> cancelLetterRequest(String id) async {
    return await _remoteDataSource.cancelLetterRequest(id);
  }

  @override
  Future<dynamic> uploadAttachments(List<String> filePaths) async {
    return await _remoteDataSource.uploadAttachments(filePaths);
  }

  @override
  Future<dynamic> getPendingLetterRequests(Map<String, dynamic> params) async {
    return await _remoteDataSource.getPendingLetterRequests(params);
  }

  @override
  Future<dynamic> approveLetterRequest(String id, {String? notes}) async {
    return await _remoteDataSource.approveLetterRequest(id, notes: notes);
  }

  @override
  Future<dynamic> rejectLetterRequest(String id, {String? notes}) async {
    return await _remoteDataSource.rejectLetterRequest(id, notes: notes);
  }

  @override
  Future<dynamic> getLetterRequestById(String id) async {
    return await _remoteDataSource.getLetterRequestById(id);
  }
}

