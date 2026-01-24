import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/models/payslip_model.dart';
import '../../domain/repositories/payslips_repository.dart';

// Events
abstract class PayslipsEvent {}

class LoadPayslips extends PayslipsEvent {}

class SelectPayslip extends PayslipsEvent {
  final PayslipModel payslip;
  SelectPayslip(this.payslip);
}

// States
abstract class PayslipsState {}

class PayslipsInitial extends PayslipsState {}

class PayslipsLoading extends PayslipsState {}

class PayslipsLoaded extends PayslipsState {
  final List<PayslipModel> payslips;
  PayslipsLoaded(this.payslips);
}

class PayslipsError extends PayslipsState {
  final String message;
  PayslipsError(this.message);
}

// BLoC
class PayslipsBloc extends Bloc<PayslipsEvent, PayslipsState> {
  final PayslipsRepository _repository;

  PayslipsBloc(this._repository) : super(PayslipsInitial()) {
    on<LoadPayslips>(_onLoadPayslips);
  }

  Future<void> _onLoadPayslips(
    LoadPayslips event,
    Emitter<PayslipsState> emit,
  ) async {
    emit(PayslipsLoading());
    try {
      final payslips = await _repository.getMyPayslips();
      emit(PayslipsLoaded(payslips));
    } catch (e) {
      emit(PayslipsError(e.toString()));
    }
  }
}
