import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/leaves_repository.dart';

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

class CancelLeaveEvent extends LeavesEvent {
  final String id;
  const CancelLeaveEvent(this.id);
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
    on<CancelLeaveEvent>(_onCancelLeave);
  }

  Future<void> _onGetMyLeaves(GetMyLeavesEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      final result = await repository.getMyLeaveRequests({'status': event.status});
      emit(LeavesLoaded(result['data'] ?? []));
    } catch (e) {
      emit(LeavesError(e.toString()));
    }
  }

  Future<void> _onCreateLeave(CreateLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.createLeaveRequest(event.data);
      add(const GetMyLeavesEvent());
    } catch (e) {
      emit(LeavesError(e.toString()));
    }
  }

  Future<void> _onCancelLeave(CancelLeaveEvent event, Emitter<LeavesState> emit) async {
    emit(LeavesLoading());
    try {
      await repository.cancelLeaveRequest(event.id);
      add(const GetMyLeavesEvent());
    } catch (e) {
      emit(LeavesError(e.toString()));
    }
  }
}

