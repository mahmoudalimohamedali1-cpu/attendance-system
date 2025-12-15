abstract class LettersRepository {
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

