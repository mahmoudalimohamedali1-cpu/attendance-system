// lib/features/raises/presentation/bloc/raises_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/raise_request.dart';
import '../../domain/repositories/raises_repository.dart';
import '../../data/models/raise_request_model.dart';

// Events
abstract class RaisesEvent extends Equatable {
  const RaisesEvent();

  @override
  List<Object?> get props => [];
}

class LoadRaisesEvent extends RaisesEvent {}

class CreateRaiseEvent extends RaisesEvent {
  final CreateRaiseRequestDto dto;

  const CreateRaiseEvent(this.dto);

  @override
  List<Object?> get props => [dto];
}

class CancelRaiseEvent extends RaisesEvent {
  final String id;

  const CancelRaiseEvent(this.id);

  @override
  List<Object?> get props => [id];
}

// States
abstract class RaisesState extends Equatable {
  const RaisesState();

  @override
  List<Object?> get props => [];
}

class RaisesInitial extends RaisesState {}

class RaisesLoading extends RaisesState {}

class RaisesLoaded extends RaisesState {
  final List<RaiseRequest> requests;
  final Map<String, int> stats;

  const RaisesLoaded({required this.requests, required this.stats});

  @override
  List<Object?> get props => [requests, stats];
}

class RaisesError extends RaisesState {
  final String message;

  const RaisesError(this.message);

  @override
  List<Object?> get props => [message];
}

class RaiseCreating extends RaisesState {}

class RaiseCreated extends RaisesState {
  final RaiseRequest request;

  const RaiseCreated(this.request);

  @override
  List<Object?> get props => [request];
}

class RaiseCreateError extends RaisesState {
  final String message;

  const RaiseCreateError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class RaisesBloc extends Bloc<RaisesEvent, RaisesState> {
  final RaisesRepository repository;

  RaisesBloc({required this.repository}) : super(RaisesInitial()) {
    on<LoadRaisesEvent>(_onLoadRaises);
    on<CreateRaiseEvent>(_onCreateRaise);
    on<CancelRaiseEvent>(_onCancelRaise);
  }

  Future<void> _onLoadRaises(LoadRaisesEvent event, Emitter<RaisesState> emit) async {
    emit(RaisesLoading());
    try {
      final requests = await repository.getMyRaiseRequests();
      final stats = await repository.getStats();
      emit(RaisesLoaded(requests: requests, stats: stats));
    } catch (e) {
      emit(RaisesError(e.toString()));
    }
  }

  Future<void> _onCreateRaise(CreateRaiseEvent event, Emitter<RaisesState> emit) async {
    emit(RaiseCreating());
    try {
      final request = await repository.createRaiseRequest(event.dto);
      emit(RaiseCreated(request));
      // Reload the list
      add(LoadRaisesEvent());
    } catch (e) {
      emit(RaiseCreateError(e.toString()));
    }
  }

  Future<void> _onCancelRaise(CancelRaiseEvent event, Emitter<RaisesState> emit) async {
    try {
      await repository.cancelRaiseRequest(event.id);
      add(LoadRaisesEvent());
    } catch (e) {
      emit(RaisesError(e.toString()));
    }
  }
}
