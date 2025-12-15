import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/letters_repository.dart';
import '../../../../core/utils/error_handler.dart';

// Events
abstract class LettersEvent extends Equatable {
  const LettersEvent();
  @override
  List<Object?> get props => [];
}

class GetMyLettersEvent extends LettersEvent {
  final String? status;
  const GetMyLettersEvent({this.status});
}

class CreateLetterEvent extends LettersEvent {
  final Map<String, dynamic> data;
  const CreateLetterEvent(this.data);
}

class CreateLetterWithAttachmentsEvent extends LettersEvent {
  final Map<String, dynamic> data;
  final List<String> attachmentPaths;
  const CreateLetterWithAttachmentsEvent(this.data, this.attachmentPaths);
  @override
  List<Object?> get props => [data, attachmentPaths];
}

class CancelLetterEvent extends LettersEvent {
  final String id;
  const CancelLetterEvent(this.id);
}

// Manager/Admin Events
class GetPendingLettersEvent extends LettersEvent {
  final Map<String, dynamic>? params;
  const GetPendingLettersEvent({this.params});
}

class ApproveLetterEvent extends LettersEvent {
  final String id;
  final String? notes;
  const ApproveLetterEvent(this.id, {this.notes});
}

class RejectLetterEvent extends LettersEvent {
  final String id;
  final String? notes;
  const RejectLetterEvent(this.id, {this.notes});
}

class GetLetterDetailsEvent extends LettersEvent {
  final String id;
  const GetLetterDetailsEvent(this.id);
}

// States
abstract class LettersState extends Equatable {
  const LettersState();
  @override
  List<Object?> get props => [];
}

class LettersInitial extends LettersState {}
class LettersLoading extends LettersState {}
class LettersLoaded extends LettersState {
  final List<dynamic> letters;
  const LettersLoaded(this.letters);
}
class LetterCreatedSuccess extends LettersState {}
class LetterApprovedSuccess extends LettersState {}
class LetterRejectedSuccess extends LettersState {}
class LetterDetailsLoaded extends LettersState {
  final dynamic letterDetails;
  const LetterDetailsLoaded(this.letterDetails);
}
class LettersError extends LettersState {
  final String message;
  const LettersError(this.message);
}

// Bloc
class LettersBloc extends Bloc<LettersEvent, LettersState> {
  final LettersRepository repository;

  LettersBloc(this.repository) : super(LettersInitial()) {
    on<GetMyLettersEvent>(_onGetMyLetters);
    on<CreateLetterEvent>(_onCreateLetter);
    on<CreateLetterWithAttachmentsEvent>(_onCreateLetterWithAttachments);
    on<CancelLetterEvent>(_onCancelLetter);
    
    // Manager/Admin handlers
    on<GetPendingLettersEvent>(_onGetPendingLetters);
    on<ApproveLetterEvent>(_onApproveLetter);
    on<RejectLetterEvent>(_onRejectLetter);
    on<GetLetterDetailsEvent>(_onGetLetterDetails);
  }

  Future<void> _onGetMyLetters(GetMyLettersEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      final result = await repository.getMyLetterRequests({'status': event.status});
      emit(LettersLoaded(result['data'] ?? []));
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل طلبات الخطاب')));
    }
  }

  Future<void> _onCreateLetter(CreateLetterEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      await repository.createLetterRequest(event.data);
      emit(LetterCreatedSuccess());
      add(const GetMyLettersEvent());
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل إرسال طلب الخطاب')));
    }
  }

  Future<void> _onCreateLetterWithAttachments(
    CreateLetterWithAttachmentsEvent event,
    Emitter<LettersState> emit,
  ) async {
    emit(LettersLoading());
    try {
      List<dynamic>? uploadedAttachments;
      
      // رفع المرفقات أولاً إذا وجدت
      if (event.attachmentPaths.isNotEmpty) {
        print('📎 Uploading ${event.attachmentPaths.length} attachments...');
        try {
          final uploadResult = await repository.uploadAttachments(event.attachmentPaths);
          if (uploadResult is Map && uploadResult.containsKey('files')) {
            uploadedAttachments = uploadResult['files'] as List<dynamic>?;
          }
          print('✅ Attachments uploaded: $uploadedAttachments');
        } catch (uploadError) {
          print('⚠️ Failed to upload attachments: $uploadError. Proceeding without attachments.');
        }
      }
      
      // إضافة المرفقات للبيانات
      final requestData = Map<String, dynamic>.from(event.data);
      if (uploadedAttachments != null && uploadedAttachments.isNotEmpty) {
        requestData['attachments'] = uploadedAttachments;
      }
      
      print('📤 Creating letter request: $requestData');
      
      // إنشاء الطلب
      await repository.createLetterRequest(requestData);
      print('✅ Letter request created successfully');
      emit(LetterCreatedSuccess());
      add(const GetMyLettersEvent());
    } catch (e) {
      print('❌ Error creating letter: $e');
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل إرسال طلب الخطاب')));
    }
  }

  Future<void> _onCancelLetter(CancelLetterEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      await repository.cancelLetterRequest(event.id);
      add(const GetMyLettersEvent());
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل إلغاء طلب الخطاب')));
    }
  }

  // Manager/Admin handlers
  Future<void> _onGetPendingLetters(GetPendingLettersEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      print('📥 Getting pending letters with params: ${event.params}');
      final result = await repository.getPendingLetterRequests(event.params ?? {});
      print('📥 Result type: ${result.runtimeType}');
      
      List<dynamic> letters;
      if (result is Map) {
        letters = result['data'] ?? [];
        print('📥 Found ${letters.length} pending letters');
      } else if (result is List) {
        letters = result;
        print('📥 Found ${letters.length} pending letters (direct list)');
      } else {
        print('⚠️ Unexpected result type: ${result.runtimeType}');
        letters = [];
      }
      
      emit(LettersLoaded(letters));
    } catch (e) {
      print('❌ Error in _onGetPendingLetters: $e');
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل الطلبات المعلقة')));
    }
  }

  Future<void> _onApproveLetter(ApproveLetterEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      await repository.approveLetterRequest(event.id, notes: event.notes);
      emit(LetterApprovedSuccess());
      add(const GetPendingLettersEvent());
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل الموافقة على طلب الخطاب')));
    }
  }

  Future<void> _onRejectLetter(RejectLetterEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      await repository.rejectLetterRequest(event.id, notes: event.notes);
      emit(LetterRejectedSuccess());
      add(const GetPendingLettersEvent());
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل رفض طلب الخطاب')));
    }
  }

  Future<void> _onGetLetterDetails(GetLetterDetailsEvent event, Emitter<LettersState> emit) async {
    emit(LettersLoading());
    try {
      final details = await repository.getLetterRequestById(event.id);
      emit(LetterDetailsLoaded(details));
    } catch (e) {
      emit(LettersError(ErrorHandler.handleError(e, defaultMessage: 'فشل تحميل تفاصيل الطلب')));
    }
  }
}

