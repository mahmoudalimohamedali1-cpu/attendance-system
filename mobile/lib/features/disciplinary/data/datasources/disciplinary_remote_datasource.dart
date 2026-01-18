import '../../../../core/network/api_client.dart';

abstract class DisciplinaryRemoteDataSource {
  /// جلب قضاياي (للموظف)
  Future<dynamic> getMyCases();
  
  /// جلب تفاصيل قضية
  Future<dynamic> getCaseById(String id);
  
  /// الرد على التحقيق غير الرسمي
  Future<dynamic> respondInformal(String caseId, {required bool accept, String? notes});
  
  /// الرد على القرار (قبول أو اعتراض)
  Future<dynamic> respondDecision(String caseId, {required bool accept, String? objectionNotes});
  
  // === للمدير ===
  /// إنشاء قضية جديدة
  Future<dynamic> createCase(Map<String, dynamic> data);
  
  /// جلب قضايا المدير
  Future<dynamic> getManagerCases();
  
  // === لـ HR ===
  /// جلب صندوق الوارد
  Future<dynamic> getInbox(String role);
  
  /// مراجعة HR
  Future<dynamic> hrReview(String caseId, {required bool approve, String? notes});
  
  /// جدولة جلسة استماع
  Future<dynamic> scheduleHearing(String caseId, Map<String, dynamic> data);
  
  /// إضافة محضر الجلسة
  Future<dynamic> addMinutes(String caseId, String notes);
  
  /// إصدار قرار
  Future<dynamic> issueDecision(String caseId, Map<String, dynamic> data);
  
  /// الاعتماد النهائي
  Future<dynamic> finalizeCase(String caseId);

  /// رفع مرفقات قضية
  Future<dynamic> uploadAttachments(String caseId, List<String> filePaths);

  /// جلب قائمة المستخدمين لاختيار المتهم
  Future<dynamic> getUsers();
  
  /// جلب جميع القضايا
  Future<dynamic> getAllCases();
}

class DisciplinaryRemoteDataSourceImpl implements DisciplinaryRemoteDataSource {
  final ApiClient _apiClient;

  DisciplinaryRemoteDataSourceImpl(this._apiClient);

  @override
  Future<dynamic> getMyCases() async {
    final response = await _apiClient.getDisciplinaryCases('employee');
    return response.data;
  }

  @override
  Future<dynamic> getCaseById(String id) async {
    final response = await _apiClient.getDisciplinaryCaseById(id);
    return response.data;
  }

  @override
  Future<dynamic> respondInformal(String caseId, {required bool accept, String? notes}) async {
    final response = await _apiClient.respondDisciplinaryInformal(
      caseId,
      accept: accept,
      notes: notes,
    );
    return response.data;
  }

  @override
  Future<dynamic> respondDecision(String caseId, {required bool accept, String? objectionNotes}) async {
    final response = await _apiClient.respondDisciplinaryDecision(
      caseId,
      accept: accept,
      objectionNotes: objectionNotes,
    );
    return response.data;
  }

  @override
  Future<dynamic> createCase(Map<String, dynamic> data) async {
    final response = await _apiClient.createDisciplinaryCase(data);
    return response.data;
  }

  @override
  Future<dynamic> getManagerCases() async {
    final response = await _apiClient.getDisciplinaryCases('manager');
    return response.data;
  }

  @override
  Future<dynamic> getInbox(String role) async {
    final response = await _apiClient.getDisciplinaryCases(role);
    return response.data;
  }

  @override
  Future<dynamic> hrReview(String caseId, {required bool approve, String? notes}) async {
    final response = await _apiClient.hrReviewDisciplinary(
      caseId,
      approve: approve,
      notes: notes,
    );
    return response.data;
  }

  @override
  Future<dynamic> scheduleHearing(String caseId, Map<String, dynamic> data) async {
    final response = await _apiClient.scheduleDisciplinaryHearing(caseId, data);
    return response.data;
  }

  @override
  Future<dynamic> addMinutes(String caseId, String notes) async {
    final response = await _apiClient.addDisciplinaryMinutes(caseId, notes);
    return response.data;
  }

  @override
  Future<dynamic> issueDecision(String caseId, Map<String, dynamic> data) async {
    final response = await _apiClient.issueDisciplinaryDecision(caseId, data);
    return response.data;
  }

  @override
  Future<dynamic> finalizeCase(String caseId) async {
    final response = await _apiClient.finalizeDisciplinaryCase(caseId);
    return response.data;
  }

  @override
  Future<dynamic> uploadAttachments(String caseId, List<String> filePaths) async {
    final response = await _apiClient.uploadDisciplinaryAttachments(caseId, filePaths);
    return response.data;
  }

  @override
  Future getUsers() async {
    final response = await _apiClient.getUsers();
    return response.data;
  }

  @override
  Future getAllCases() async {
    final response = await _apiClient.getDisciplinaryCases('all');
    return response.data;
  }
}
