import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/tasks_repository.dart';

// ============ EVENTS ============

abstract class TasksEvent extends Equatable {
  const TasksEvent();

  @override
  List<Object?> get props => [];
}

class LoadMyTasks extends TasksEvent {}

class RefreshMyTasks extends TasksEvent {}

class LoadTaskDetails extends TasksEvent {
  final String taskId;

  const LoadTaskDetails(this.taskId);

  @override
  List<Object?> get props => [taskId];
}

class UpdateTaskStatus extends TasksEvent {
  final String taskId;
  final String newStatus;

  const UpdateTaskStatus(this.taskId, this.newStatus);

  @override
  List<Object?> get props => [taskId, newStatus];
}

class AddTaskComment extends TasksEvent {
  final String taskId;
  final String content;

  const AddTaskComment(this.taskId, this.content);

  @override
  List<Object?> get props => [taskId, content];
}

// ============ STATES ============

abstract class TasksState extends Equatable {
  const TasksState();

  @override
  List<Object?> get props => [];
}

class TasksInitial extends TasksState {}

class TasksLoading extends TasksState {}

class TasksLoaded extends TasksState {
  final List<TaskEntity> tasks;

  const TasksLoaded(this.tasks);

  @override
  List<Object?> get props => [tasks];

  /// Get tasks by status
  List<TaskEntity> getByStatus(String status) =>
      tasks.where((t) => t.status == status).toList();

  /// Get in-progress tasks count
  int get inProgressCount =>
      tasks.where((t) => t.status == 'IN_PROGRESS').length;

  /// Get pending tasks count
  int get pendingCount =>
      tasks.where((t) => t.status == 'TODO' || t.status == 'BACKLOG').length;

  /// Get completed tasks count
  int get completedCount =>
      tasks.where((t) => t.status == 'COMPLETED').length;
}

class TasksError extends TasksState {
  final String message;

  const TasksError(this.message);

  @override
  List<Object?> get props => [message];
}

class TaskDetailLoading extends TasksState {}

class TaskDetailLoaded extends TasksState {
  final TaskEntity task;

  const TaskDetailLoaded(this.task);

  @override
  List<Object?> get props => [task];
}

class TaskUpdating extends TasksState {}

class TaskUpdated extends TasksState {
  final TaskEntity task;
  final String message;

  const TaskUpdated(this.task, this.message);

  @override
  List<Object?> get props => [task, message];
}

// ============ BLOC ============

class TasksBloc extends Bloc<TasksEvent, TasksState> {
  final TasksRepository _repository;

  TasksBloc(this._repository) : super(TasksInitial()) {
    on<LoadMyTasks>(_onLoadMyTasks);
    on<RefreshMyTasks>(_onRefreshMyTasks);
    on<LoadTaskDetails>(_onLoadTaskDetails);
    on<UpdateTaskStatus>(_onUpdateTaskStatus);
    on<AddTaskComment>(_onAddTaskComment);
  }

  Future<void> _onLoadMyTasks(
    LoadMyTasks event,
    Emitter<TasksState> emit,
  ) async {
    emit(TasksLoading());
    try {
      final tasks = await _repository.getMyTasks();
      emit(TasksLoaded(tasks));
    } catch (e) {
      emit(TasksError('حدث خطأ أثناء تحميل المهام. يرجى المحاولة مرة أخرى.'));
    }
  }

  Future<void> _onRefreshMyTasks(
    RefreshMyTasks event,
    Emitter<TasksState> emit,
  ) async {
    try {
      final tasks = await _repository.getMyTasks();
      emit(TasksLoaded(tasks));
    } catch (e) {
      emit(TasksError('حدث خطأ أثناء تحديث المهام. يرجى المحاولة مرة أخرى.'));
    }
  }

  Future<void> _onLoadTaskDetails(
    LoadTaskDetails event,
    Emitter<TasksState> emit,
  ) async {
    emit(TaskDetailLoading());
    try {
      final task = await _repository.getTaskById(event.taskId);
      emit(TaskDetailLoaded(task));
    } catch (e) {
      emit(TasksError('حدث خطأ أثناء تحميل تفاصيل المهمة. يرجى المحاولة مرة أخرى.'));
    }
  }

  Future<void> _onUpdateTaskStatus(
    UpdateTaskStatus event,
    Emitter<TasksState> emit,
  ) async {
    emit(TaskUpdating());
    try {
      final task = await _repository.updateTaskStatus(event.taskId, event.newStatus);
      emit(TaskUpdated(task, 'تم تحديث حالة المهمة بنجاح'));
    } catch (e) {
      emit(TasksError('حدث خطأ أثناء تحديث حالة المهمة. يرجى المحاولة مرة أخرى.'));
    }
  }

  Future<void> _onAddTaskComment(
    AddTaskComment event,
    Emitter<TasksState> emit,
  ) async {
    try {
      await _repository.addComment(event.taskId, event.content);
      // Reload task details after adding comment
      final task = await _repository.getTaskById(event.taskId);
      emit(TaskDetailLoaded(task));
    } catch (e) {
      emit(TasksError('حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مرة أخرى.'));
    }
  }
}
