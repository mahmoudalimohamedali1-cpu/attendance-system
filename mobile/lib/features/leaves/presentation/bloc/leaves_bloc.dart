import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/leaves_repository.dart';
import '../../../../core/utils/error_handler.dart';

// Events
abstract class LeavesEvent extends Equatable {
  const LeavesEvent();
  @override
  List<Object?> get props => [];
}

class GetMyLeavesEvent extends LeavesEvent {
  final String? status;
  const GetMyLeavesEvent({this.status});
}

class CreateLeaveEvent extends LeavesEvent {
  final Map<String, dynamic> data;
  const CreateLeaveEvent(this.data);
}

// Event جديد لإنشاء طلب مع مرفقات
class CreateLeaveWithAttachmentsEvent extends LeavesEvent {
  final Map<String, dynamic> data;
  final List<String> attachmentPaths;
  const CreateLeaveWithAttachmentsEvent(this.data, this.attachmentPaths);
}

class CancelLeaveEvent extends LeavesEvent {
  final String id;
  const CancelLeaveEvent(this.id);
}

// Manager/Admin Events
class GetPendingLeavesEvent extends LeavesEvent {
  final Map<String, dynamic>? params;
  const GetPendingLeavesEvent({this.params});
}

class ApproveLeaveEvent extends LeavesEvent {
  final String id;
  final String? notes;
  const ApproveLeaveEvent(this.id, {this.notes});
}

class RejectLeaveEvent extends LeavesEvent {
  final String id;
  final String? notes;
  const RejectLeaveEvent(this.id, {this.notes});
}

class GetLeaveDetailsEvent extends LeavesEvent {
  final String id;
  const GetLeaveDetailsEvent(this.id);
}

// States
abstract class LeavesState extends Equatable {
  const LeavesState();
  @override
  List<Object?> get props => [];
}

class LeavesInitial extends LeavesState {}
class LeavesLoading extends LeavesState {}
class LeavesLoaded extends LeavesState {
  final List<dynamic> leaves;
  const LeavesLoaded(this.leaves);
}
class LeaveCreatedSuccess extends LeavesState {} // حالة نجاح إنشاء الطلب
class LeaveApprovedSuccess extends LeavesState {} // حالة نجاح الموافقة
class LeaveRejectedSuccess extends LeavesState {} // حالة نجاح الرفض
class LeaveDetailsLoaded extends LeavesState {
  final dynamic leaveDetails;
  const LeaveDetailsLoaded(this.leaveDetails);
}
class LeavesError extends LeavesState {
  final String message;
  const LeavesError(this.message);
}

// Bloc
class LeavesBloc extends Bloc<LeavesEvent, LeavesState> {
  final LeavesRepository repository;

  LeavesBloc(this.repository) : super(LeavesInitial()) {
    on<GetMyLeavesEvent>(_onGetMyLeaves);
    on<CreateLeaveEvent>(_onCreateLeave);
    on<CreateLeaveWithAttachmentsEvent>(_onCreateLeaveWithAttachments);
    on<CancelLeaveEvent>(_onCancelLeave);
    
    // Manager/Admin handlers
    on<GetPendingLeavesEvent>(_onGetPendingLeaves);
    on<ApproveLeaveEvent>(_onApproveLeave);
    on<RejectLeaveEvent>(_onRejectLeave);
    on<GetLeaveDetailsEvent>(_onGetLeaveDetails);
  }

  Future<void> _onGetMyLeaves(GetMyLeavesEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      final result = await repository.getMyLeaveRequests({'status': event.status});
      emit(LeavesLoaded(result['data'] ?? []));
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل طلبات الإجازة')));
    }
  }

  Future<void> _onCreateLeave(CreateLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.createLeaveRequest(event.data);
      add(const GetMyLeavesEvent());
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل إرسال طلب الإجازة')));
    }
  }

  // إنشاء طلب مع مرفقات
  Future<void> _onCreateLeaveWithAttachments(
    CreateLeaveWithAttachmentsEvent event,
    Emitter<LeavesState> emit,
  ) async {
    emit(LeavesLoading());
    try {
      List<dynamic>? uploadedAttachments;
      
      // رفع المرفقات أولاً إذا وجدت
      if (event.attachmentPaths.isNotEmpty) {
        debugPrint('📎 Uploading ${event.attachmentPaths.length} attachments...');
        debugPrint('📎 Paths: ${event.attachmentPaths}');
        try {
          final uploadResult = await repository.uploadAttachments(event.attachmentPaths);
          debugPrint('📎 Upload result: $uploadResult');
          if (uploadResult is Map && uploadResult.containsKey('files')) {
            uploadedAttachments = uploadResult['files'] as List<dynamic>?;
          }
          debugPrint('✅ Attachments uploaded: $uploadedAttachments');
        } catch (uploadError) {
          debugPrint('❌ Upload failed: $uploadError');
          // استمر بدون المرفقات إذا فشل الرفع
          debugPrint('⚠️ Continuing without attachments...');
        }
      }
      
      // إضافة المرفقات للبيانات
      final requestData = Map<String, dynamic>.from(event.data);
      if (uploadedAttachments != null && uploadedAttachments.isNotEmpty) {
        requestData['attachments'] = uploadedAttachments;
      }
      
      debugPrint('📤 Creating leave request: $requestData');
      
      // إنشاء الطلب
      await repository.createLeaveRequest(requestData);
      debugPrint('✅ Leave request created successfully');
      emit(LeaveCreatedSuccess()); // إرسال حالة النجاح أولاً
      // ثم تحديث القائمة
      add(const GetMyLeavesEvent());
    } catch (e) {
      debugPrint('❌ Error creating leave: $e');
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل إرسال طلب الإجازة')));
    }
  }

  Future<void> _onCancelLeave(CancelLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.cancelLeaveRequest(event.id);
      add(const GetMyLeavesEvent());
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل إلغاء طلب الإجازة')));
    }
  }

  // Manager/Admin handlers
  Future<void> _onGetPendingLeaves(GetPendingLeavesEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      debugPrint('📥 Getting pending leaves with params: ${event.params}');
      final result = await repository.getPendingLeaveRequests(event.params ?? {});
      debugPrint('📥 Result type: ${result.runtimeType}');
      debugPrint('📥 Result: $result');
      
      // Handle different response structures
      List<dynamic> leaves;
      if (result is Map) {
        leaves = result['data'] ?? [];
        debugPrint('📥 Found ${leaves.length} pending leaves');
      } else if (result is List) {
        leaves = result;
        debugPrint('📥 Found ${leaves.length} pending leaves (direct list)');
      } else {
        debugPrint('⚠️ Unexpected result type: ${result.runtimeType}');
        leaves = [];
      }
      
      emit(LeavesLoaded(leaves));
    } catch (e) {
      debugPrint('❌ Error in _onGetPendingLeaves: $e');
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل الطلبات المعلقة')));
    }
  }

  Future<void> _onApproveLeave(ApproveLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.approveLeaveRequest(event.id, notes: event.notes);
      emit(LeaveApprovedSuccess());
      // تحديث قائمة الطلبات المعلقة
      add(const GetPendingLeavesEvent());
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل الموافقة على طلب الإجازة')));
    }
  }

  Future<void> _onRejectLeave(RejectLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.rejectLeaveRequest(event.id, notes: event.notes);
      emit(LeaveRejectedSuccess());
      // تحديث قائمة الطلبات المعلقة
      add(const GetPendingLeavesEvent());
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل رفض طلب الإجازة')));
    }
  }

  Future<void> _onGetLeaveDetails(GetLeaveDetailsEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      final details = await repository.getLeaveRequestById(event.id);
      emit(LeaveDetailsLoaded(details));
    } catch (e) {
      emit(LeavesError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل تفاصيل الطلب')));
    }
  }
}
