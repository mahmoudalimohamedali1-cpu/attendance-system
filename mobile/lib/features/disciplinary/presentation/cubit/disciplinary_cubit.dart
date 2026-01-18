import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/disciplinary_remote_datasource.dart';
import '../../data/models/disciplinary_case_model.dart';
import 'disciplinary_state.dart';

class DisciplinaryCubit extends Cubit<DisciplinaryState> {
  final DisciplinaryRemoteDataSource _dataSource;

  DisciplinaryCubit(this._dataSource) : super(DisciplinaryInitial());

  /// جلب قضاياي (للموظف)
  Future<void> loadMyCases() async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getMyCases();
      final cases = (response as List)
          .map((json) => DisciplinaryCase.fromJson(json))
          .toList();
      emit(DisciplinaryCasesLoaded(cases));
    } catch (e) {
      emit(DisciplinaryError('فشل في تحميل القضايا: ${e.toString()}'));
    }
  }

  /// جلب تفاصيل قضية
  Future<void> loadCaseDetails(String caseId) async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getCaseById(caseId);
      final caseDetails = DisciplinaryCase.fromJson(response);
      emit(DisciplinaryCaseDetailLoaded(caseDetails));
    } catch (e) {
      emit(DisciplinaryError('فشل في تحميل التفاصيل: ${e.toString()}'));
    }
  }

  /// الرد على التحقيق غير الرسمي
  Future<void> respondInformal(String caseId, {required bool accept, String? notes}) async {
    emit(DisciplinaryLoading());
    try {
      await _dataSource.respondInformal(caseId, accept: accept, notes: notes);
      emit(DisciplinaryActionSuccess(accept ? 'تم قبول التحقيق غير الرسمي' : 'تم رفض التحقيق غير الرسمي'));
      // إعادة تحميل التفاصيل
      await loadCaseDetails(caseId);
    } catch (e) {
      emit(DisciplinaryError('فشل في الرد: ${e.toString()}'));
    }
  }

  /// الرد على القرار
  Future<void> respondDecision(String caseId, {required bool accept, String? objectionNotes}) async {
    emit(DisciplinaryLoading());
    try {
      await _dataSource.respondDecision(caseId, accept: accept, objectionNotes: objectionNotes);
      emit(DisciplinaryActionSuccess(accept ? 'تم قبول القرار' : 'تم تسجيل الاعتراض'));
      await loadCaseDetails(caseId);
    } catch (e) {
      emit(DisciplinaryError('فشل في الرد: ${e.toString()}'));
    }
  }

  // === للمدير ===
  
  /// إنشاء قضية جديدة
  Future<void> createCase(Map<String, dynamic> data, {List<String>? attachmentPaths}) async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.createCase(data);
      final caseId = response['id'] ?? response['caseId'];
      
      // رفع المرفقات إن وجدت
      if (attachmentPaths != null && attachmentPaths.isNotEmpty && caseId != null) {
        try {
          await _dataSource.uploadAttachments(caseId.toString(), attachmentPaths);
        } catch (e) {
          // إذا فشل رفع المرفقات، لا نوقف العملية لكن نظهر تحذير
          emit(DisciplinaryActionSuccess('تم إنشاء القضية بنجاح (فشل رفع بعض المرفقات)'));
          return;
        }
      }
      
      emit(DisciplinaryActionSuccess('تم إنشاء القضية بنجاح'));
    } catch (e) {
      emit(DisciplinaryError('فشل في إنشاء القضية: ${e.toString()}'));
    }
  }

  /// جلب قضايا المدير
  Future<void> loadManagerCases() async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getManagerCases();
      final cases = (response as List)
          .map((json) => DisciplinaryCase.fromJson(json))
          .toList();
      emit(DisciplinaryCasesLoaded(cases));
    } catch (e) {
      emit(DisciplinaryError('فشل في تحميل القضايا: ${e.toString()}'));
    }
  }

  // === لـ HR ===
  
  /// جلب صندوق الوارد
  Future<void> loadInbox(String role) async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getInbox(role);
      final cases = (response as List)
          .map((json) => DisciplinaryCase.fromJson(json))
          .toList();
      emit(DisciplinaryCasesLoaded(cases));
    } catch (e) {
      emit(DisciplinaryError('فشل في تحميل الصندوق: ${e.toString()}'));
    }
  }

  /// مراجعة HR
  Future<void> hrReview(String caseId, {required bool approve, String? notes}) async {
    emit(DisciplinaryLoading());
    try {
      await _dataSource.hrReview(caseId, approve: approve, notes: notes);
      emit(DisciplinaryActionSuccess(approve ? 'تمت الموافقة' : 'تم الرفض'));
    } catch (e) {
      emit(DisciplinaryError('فشل في المراجعة: ${e.toString()}'));
    }
  }

  /// إصدار قرار
  Future<void> issueDecision(String caseId, Map<String, dynamic> data) async {
    emit(DisciplinaryLoading());
    try {
      await _dataSource.issueDecision(caseId, data);
      emit(DisciplinaryActionSuccess('تم إصدار القرار'));
    } catch (e) {
      emit(DisciplinaryError('فشل في إصدار القرار: ${e.toString()}'));
    }
  }

  /// الاعتماد النهائي
  Future<void> finalizeCase(String caseId) async {
    emit(DisciplinaryLoading());
    try {
      await _dataSource.finalizeCase(caseId);
      emit(DisciplinaryActionSuccess('تم الاعتماد النهائي بنجاح'));
      loadAllCases(); // تحديث القائمة
    } catch (e) {
      emit(DisciplinaryError('فشل الاعتماد: ${e.toString()}'));
    }
  }

  Future<void> loadUsers() async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getUsers();
      emit(DisciplinaryUsersLoaded(response as List));
    } catch (e) {
      emit(DisciplinaryError('فشل تحميل الموظفين: ${e.toString()}'));
    }
  }

  /// جلب جميع القضايا
  Future<void> loadAllCases() async {
    emit(DisciplinaryLoading());
    try {
      final response = await _dataSource.getAllCases();
      final cases = (response as List)
          .map((json) => DisciplinaryCase.fromJson(json))
          .toList();
      emit(DisciplinaryCasesLoaded(cases));
    } catch (e) {
      emit(DisciplinaryError('فشل في تحميل القضايا: ${e.toString()}'));
    }
  }

  /// جدولة جلسة استماع
  Future<void> scheduleHearing(String caseId, DateTime date, String location, {String? notes}) async {
    emit(DisciplinaryLoading());
    try {
      final data = {
        'scheduledDate': date.toIso8601String(),
        'location': location,
        if (notes != null) 'notes': notes,
      };
      await _dataSource.scheduleHearing(caseId, data);
      emit(DisciplinaryActionSuccess('تم جدولة جلسة الاستماع'));
      await loadCaseDetails(caseId);
    } catch (e) {
      emit(DisciplinaryError('فشل في جدولة الجلسة: ${e.toString()}'));
    }
  }
}
