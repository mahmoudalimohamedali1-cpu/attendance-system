import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/services/location_service.dart';
import '../../domain/entities/attendance_entity.dart';
import '../../domain/usecases/check_in_usecase.dart';
import '../../domain/usecases/check_out_usecase.dart';
import '../../domain/usecases/get_attendance_history_usecase.dart';
import '../../domain/usecases/get_today_attendance_usecase.dart';

// Events
abstract class AttendanceEvent extends Equatable {
  const AttendanceEvent();

  @override
  List<Object?> get props => [];
}

class GetTodayAttendanceEvent extends AttendanceEvent {}

class CheckInEvent extends AttendanceEvent {
  final List<double>? faceEmbedding;
  final String? faceImage;
  
  const CheckInEvent({this.faceEmbedding, this.faceImage});
  
  @override
  List<Object?> get props => [faceEmbedding, faceImage];
}

class CheckOutEvent extends AttendanceEvent {
  final List<double>? faceEmbedding;
  final String? faceImage;
  
  const CheckOutEvent({this.faceEmbedding, this.faceImage});
  
  @override
  List<Object?> get props => [faceEmbedding, faceImage];
}

class GetAttendanceHistoryEvent extends AttendanceEvent {
  final DateTime? startDate;
  final DateTime? endDate;
  final String? status;
  final int page;

  const GetAttendanceHistoryEvent({
    this.startDate,
    this.endDate,
    this.status,
    this.page = 1,
  });

  @override
  List<Object?> get props => [startDate, endDate, status, page];
}

class GetMonthlyStatsEvent extends AttendanceEvent {
  final int year;
  final int month;

  const GetMonthlyStatsEvent({required this.year, required this.month});

  @override
  List<Object?> get props => [year, month];
}

// States
abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceLoaded extends AttendanceState {
  final AttendanceEntity? todayAttendance;
  final List<AttendanceEntity> history;
  final AttendanceStats? stats;

  const AttendanceLoaded({
    this.todayAttendance,
    this.history = const [],
    this.stats,
  });

  @override
  List<Object?> get props => [todayAttendance, history, stats];

  AttendanceLoaded copyWith({
    AttendanceEntity? todayAttendance,
    List<AttendanceEntity>? history,
    AttendanceStats? stats,
  }) {
    return AttendanceLoaded(
      todayAttendance: todayAttendance ?? this.todayAttendance,
      history: history ?? this.history,
      stats: stats ?? this.stats,
    );
  }
}

class AttendanceCheckInSuccess extends AttendanceState {
  final AttendanceEntity attendance;
  final int lateMinutes;
  final bool isLate;

  const AttendanceCheckInSuccess({
    required this.attendance,
    required this.lateMinutes,
    required this.isLate,
  });

  @override
  List<Object?> get props => [attendance, lateMinutes, isLate];
}

class AttendanceCheckOutSuccess extends AttendanceState {
  final AttendanceEntity attendance;
  final int earlyLeaveMinutes;
  final bool isEarlyLeave;
  final int workingMinutes;

  const AttendanceCheckOutSuccess({
    required this.attendance,
    required this.earlyLeaveMinutes,
    required this.isEarlyLeave,
    required this.workingMinutes,
  });

  @override
  List<Object?> get props => [attendance, earlyLeaveMinutes, isEarlyLeave, workingMinutes];
}

class AttendanceError extends AttendanceState {
  final String message;

  const AttendanceError(this.message);

  @override
  List<Object?> get props => [message];
}

// Bloc
class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final CheckInUseCase checkInUseCase;
  final CheckOutUseCase checkOutUseCase;
  final GetAttendanceHistoryUseCase getHistoryUseCase;
  final GetTodayAttendanceUseCase getTodayAttendanceUseCase;
  final LocationService locationService;

  AttendanceEntity? _todayAttendance;
  List<AttendanceEntity> _history = [];

  AttendanceBloc({
    required this.checkInUseCase,
    required this.checkOutUseCase,
    required this.getHistoryUseCase,
    required this.getTodayAttendanceUseCase,
    required this.locationService,
  }) : super(AttendanceInitial()) {
    on<GetTodayAttendanceEvent>(_onGetTodayAttendance);
    on<CheckInEvent>(_onCheckIn);
    on<CheckOutEvent>(_onCheckOut);
    on<GetAttendanceHistoryEvent>(_onGetHistory);
    on<GetMonthlyStatsEvent>(_onGetMonthlyStats);
  }

  Future<void> _onGetTodayAttendance(
    GetTodayAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    final result = await getTodayAttendanceUseCase();

    result.fold(
      (failure) => emit(AttendanceError(failure.message)),
      (todayResult) {
        _todayAttendance = todayResult.attendance;
        emit(AttendanceLoaded(
          todayAttendance: _todayAttendance,
          history: _history,
        ));
      },
    );
  }

  Future<void> _onCheckIn(
    CheckInEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    try {
      // Get current location
      final location = await locationService.getCurrentLocation();

      // فحص الموقع الوهمي - مفعل
      if (location.isMockLocation) {
        final reason = location.mockReason ?? 'موقع وهمي';
        emit(AttendanceError('تم رصد استخدام موقع وهمي ($reason). لا يمكن تسجيل الحضور.'));
        return;
      }

      // Call check-in use case
      final result = await checkInUseCase(
        latitude: location.latitude,
        longitude: location.longitude,
        isMockLocation: location.isMockLocation,
        deviceInfo: 'Flutter Mobile App',
        faceEmbedding: event.faceEmbedding,
        faceImage: event.faceImage,
      );

      result.fold(
        (failure) => emit(AttendanceError(failure.message)),
        (checkInResult) {
          _todayAttendance = checkInResult.attendance;
          emit(AttendanceCheckInSuccess(
            attendance: checkInResult.attendance,
            lateMinutes: checkInResult.lateMinutes,
            isLate: checkInResult.isLate,
          ));
          // Also update the loaded state
          emit(AttendanceLoaded(
            todayAttendance: _todayAttendance,
            history: _history,
          ));
        },
      );
    } on LocationException catch (e) {
      emit(AttendanceError(e.message));
    } catch (e) {
      emit(AttendanceError('فشل تسجيل الحضور: ${e.toString()}'));
    }
  }

  Future<void> _onCheckOut(
    CheckOutEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    try {
      final location = await locationService.getCurrentLocation();

      // فحص الموقع الوهمي - مفعل
      if (location.isMockLocation) {
        final reason = location.mockReason ?? 'موقع وهمي';
        emit(AttendanceError('تم رصد استخدام موقع وهمي ($reason). لا يمكن تسجيل الانصراف.'));
        return;
      }

      final result = await checkOutUseCase(
        latitude: location.latitude,
        longitude: location.longitude,
        isMockLocation: location.isMockLocation,
        deviceInfo: 'Flutter Mobile App',
        faceEmbedding: event.faceEmbedding,
        faceImage: event.faceImage,
      );

      result.fold(
        (failure) => emit(AttendanceError(failure.message)),
        (checkOutResult) {
          _todayAttendance = checkOutResult.attendance;
          emit(AttendanceCheckOutSuccess(
            attendance: checkOutResult.attendance,
            earlyLeaveMinutes: checkOutResult.earlyLeaveMinutes,
            isEarlyLeave: checkOutResult.isEarlyLeave,
            workingMinutes: checkOutResult.workingMinutes,
          ));
          emit(AttendanceLoaded(
            todayAttendance: _todayAttendance,
            history: _history,
          ));
        },
      );
    } on LocationException catch (e) {
      emit(AttendanceError(e.message));
    } catch (e) {
      emit(AttendanceError('فشل تسجيل الانصراف: ${e.toString()}'));
    }
  }

  Future<void> _onGetHistory(
    GetAttendanceHistoryEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());

    final result = await getHistoryUseCase(
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      page: event.page,
    );

    result.fold(
      (failure) => emit(AttendanceError(failure.message)),
      (historyResult) {
        _history = historyResult.data;
        emit(AttendanceLoaded(
          todayAttendance: _todayAttendance,
          history: _history,
        ));
      },
    );
  }

  Future<void> _onGetMonthlyStats(
    GetMonthlyStatsEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    // Load history for the month first
    final startDate = DateTime(event.year, event.month, 1);
    final endDate = DateTime(event.year, event.month + 1, 0);
    
    final result = await getHistoryUseCase(
      startDate: startDate,
      endDate: endDate,
    );

    result.fold(
      (failure) {
        // Keep current state but with empty stats
        emit(AttendanceLoaded(
          todayAttendance: _todayAttendance,
          history: _history,
          stats: const AttendanceStats(),
        ));
      },
      (historyResult) {
        // Calculate stats from history
        int presentDays = 0;
        int lateDays = 0;
        int absentDays = 0;
        int onLeaveDays = 0;
        int totalWorkingMinutes = 0;
        int totalLateMinutes = 0;

        for (final attendance in historyResult.data) {
          switch (attendance.status) {
            case 'PRESENT':
              presentDays++;
              break;
            case 'LATE':
              lateDays++;
              presentDays++; // Late is also present
              totalLateMinutes += attendance.lateMinutes;
              break;
            case 'ABSENT':
              absentDays++;
              break;
            case 'ON_LEAVE':
              onLeaveDays++;
              break;
          }
          totalWorkingMinutes += attendance.workingMinutes;
        }

        final stats = AttendanceStats(
          totalDays: historyResult.data.length,
          presentDays: presentDays,
          lateDays: lateDays,
          absentDays: absentDays,
          onLeaveDays: onLeaveDays,
          totalWorkingMinutes: totalWorkingMinutes,
          totalLateMinutes: totalLateMinutes,
        );

        emit(AttendanceLoaded(
          todayAttendance: _todayAttendance,
          history: _history,
          stats: stats,
        ));
      },
    );
  }
}

